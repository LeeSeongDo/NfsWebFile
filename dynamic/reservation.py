from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError
import redis
import time

router = APIRouter()

DB_URL = "mysql+pymysql://root:1234@mysql:3306/ticket"
engine = create_engine(DB_URL)
rd = redis.Redis(host='redis-service', port=6379, db=0, decode_responses=True)

class ReservationRequest(BaseModel):
    user_id: str
    seat_num: str
    perf_id: str
    perf_title: str
    select_date: str
    select_time: str
    place: str
    price: int

# ✨ [NEW] 프론트엔드에서 화면을 그릴 때 "이미 팔린 좌석" 목록을 가져가는 GET API
@router.get("/api/reservations/seats")
def get_reserved_seats(perf_id: str, date: str, time: str):
    try:
        with engine.connect() as conn:
            # 특정 공연, 날짜, 시간에 상태가 'OCCUPIED'인 좌석 번호만 싹 긁어옵니다.
            query = text("""
                SELECT seat_num FROM seat 
                WHERE perf_id = :perf_id AND perf_date = :date AND perf_time = :time AND status = 'OCCUPIED'
            """)
            result = conn.execute(query, {"perf_id": perf_id, "date": date, "time": time}).fetchall()
            
            # ['S1', 'S5'] 같은 리스트 형태로 변환해서 프론트에 전달
            reserved_seats = [row[0] for row in result]
            return {"status": "success", "reserved_seats": reserved_seats}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/api/reservations")
def create_reservation(req: ReservationRequest):
    try:
        now = time.time()
        rd.zadd("ticket_queue", {req.user_id: now})
        rank = rd.zrank("ticket_queue", req.user_id) + 1

        with engine.begin() as conn:
            
            check_query = text("""
                SELECT seat_id FROM seat 
                WHERE perf_id = :perf_id AND perf_date = :select_date AND perf_time = :select_time AND seat_num = :seat_num
            """)
            existing_seat = conn.execute(check_query, {
                "perf_id": req.perf_id, "select_date": req.select_date,
                "select_time": req.select_time, "seat_num": req.seat_num
            }).fetchone()

            if existing_seat:
                return {"status": "fail", "message": "이미 예매가 완료된 좌석입니다.", "waiting_number": rank}

            insert_seat_query = text("""
                INSERT INTO seat (seat_num, perf_id, perf_date, perf_time, status, version)
                VALUES (:seat_num, :perf_id, :select_date, :select_time, 'OCCUPIED', 1)
            """)
            
            try:
                conn.execute(insert_seat_query, {
                    "seat_num": req.seat_num, "perf_id": req.perf_id,
                    "select_date": req.select_date, "select_time": req.select_time
                })
            except IntegrityError:
                return {"status": "fail", "message": "간발의 차이로 다른 분이 먼저 예매했습니다.", "waiting_number": rank}

            seat_id_result = conn.execute(text("SELECT LAST_INSERT_ID()")).fetchone()
            real_seat_id = seat_id_result[0]

            # ✨ [UPDATE] 예약 장부에 seat_num 컬럼도 같이 넣도록 쿼리 수정!
            insert_res_query = text("""
                INSERT INTO reservation (user_id, seat_id, seat_num, perf_id, perf_title, select_date, select_time, place, price)
                VALUES (:user_id, :seat_id, :seat_num, :perf_id, :perf_title, :select_date, :select_time, :place, :price)
            """)
            conn.execute(insert_res_query, {
                "user_id": req.user_id,
                "seat_id": real_seat_id,
                "seat_num": req.seat_num,  # 추가된 파라미터
                "perf_id": req.perf_id,
                "perf_title": req.perf_title,
                "select_date": req.select_date,
                "select_time": req.select_time,
                "place": req.place,
                "price": req.price
            })

        return {"status": "success", "message": f"[{req.perf_title}] {req.seat_num} 좌석 예매 완료!", "waiting_number": rank}

    except Exception as e:
        print(f"Error: {e}")
        return {"status": "error", "message": f"예약 중 오류 발생: {str(e)}"}