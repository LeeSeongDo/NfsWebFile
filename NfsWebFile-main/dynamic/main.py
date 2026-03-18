from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, text
import redis
import json
import time
import login  
import signin
import reservation


app = FastAPI()

DB_URL = "mysql+pymysql://root:1234@mysql:3306/ticket"
engine = create_engine(DB_URL)

rd = redis.Redis(host='redis-service', port=6379, db=0, decode_responses=True)

# 🚨 여기가 핵심입니다! 와일드카드(*) 대신 프론트엔드 도메인만 적어줍니다.
origins = [
    "http://www.pulseticket.ke:30007",
    "http://10.4.0.201", # IP로 직접 접속할 때를 대비해 이것도 하나 남겨둡니다.
    "http://10.4.0.150:30007",
    "http://10.4.0.150"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # <--- 수정된 부분
    allow_credentials=True,      # 쿠키 허용 (이게 True일 땐 절대 origins에 "*"를 쓰면 안 됨)
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(login.router)
app.include_router(signin.router)
app.include_router(reservation.router)

@app.get("/")
async def root():
    return {"message": "티켓팅 API 서버가 작동 중입니다."}

@app.get("/db-test")
async def db_test():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            return {"status": "success", "db_result": "Connected to MySQL/MariaDB!"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/reservations/{user_id}")
def get_user_reservations(user_id: str):
    try:
        with engine.connect() as conn:
            # 파이썬에서 JSON으로 쉽게 변환되도록 날짜와 시간 포맷을 지정하여 SELECT
            query = text("""
                SELECT
                    res_id, user_id, seat_id, seat_num, perf_id, perf_title,
                    DATE_FORMAT(select_date, '%Y-%m-%d') as select_date,
                    TIME_FORMAT(select_time, '%H:%i:%s') as select_time,
                    place, price,
                    DATE_FORMAT(res_date, '%Y-%m-%d %H:%i:%s') as res_date
                FROM reservation
                WHERE user_id = :uid
                ORDER BY res_date DESC
            """)

            result = conn.execute(query, {"uid": user_id}).mappings().all()

            # 조회된 데이터를 딕셔너리 리스트로 변환하여 반환
            return [dict(row) for row in result]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB 조회 중 오류 발생: {str(e)}")
