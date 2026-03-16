const API_BASE_URL = "http://10.4.0.201";

let perfInfo = {};
let selectedSeat = null;

function safeNavigate(url) { window.location.href = url; }

// ✨ 화면이 로딩될 때 백엔드에서 예약된 좌석 데이터를 먼저 기다립니다.
document.addEventListener('DOMContentLoaded', async () => {
    updateHeaderUI();
    if (typeof lucide !== 'undefined') lucide.createIcons();

    let userId = sessionStorage.getItem('u_id');
    if (!userId) {
        userId = 'test_user';
        sessionStorage.setItem('u_id', userId);
        sessionStorage.setItem('ename', '테스터');
        updateHeaderUI(); 
    }

    const urlParams = new URLSearchParams(window.location.search);
    perfInfo = {
        perf_id: urlParams.get('id') || 'TEST_PERF_001',
        perf_title: urlParams.get('title') || '테스트 고정 공연',
        select_date: urlParams.get('date') || '2026-05-01',
        select_time: urlParams.get('time') || '19:00',
        place: urlParams.get('place') || 'PULSE 그랜드 시어터',
        price: parseInt(urlParams.get('price')) || 100000,
        poster: urlParams.get('poster') || 'https://via.placeholder.com/300x420?text=Test+Poster'
    };

    document.getElementById('infoPoster').src = perfInfo.poster;
    document.getElementById('infoTitle').textContent = perfInfo.perf_title;
    document.getElementById('infoDateTime').textContent = `${perfInfo.select_date} ${perfInfo.select_time}`;
    document.getElementById('infoPlace').textContent = perfInfo.place;

    // ✨ 백엔드에 팔린 좌석 목록을 물어보고 배열(예: ["S1", "S5"])로 받아옵니다.
    const reservedSeats = await fetchReservedSeats();
    
    // 받아온 목록을 토대로 좌석을 그립니다.
    renderSeats(reservedSeats);
});

// ✨ [NEW] 백엔드 GET API 호출 함수
async function fetchReservedSeats() {
    try {
        const url = `${API_BASE_URL}/api/reservations/seats?perf_id=${perfInfo.perf_id}&date=${perfInfo.select_date}&time=${perfInfo.select_time}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.status === 'success') {
            return data.reserved_seats; // 팔린 좌석 배열 리턴
        }
    } catch (e) {
        console.error("예약된 좌석 정보 로딩 실패:", e);
    }
    return []; // 실패 시 빈 배열 리턴
}

// ✨ [UPDATE] 예약된 좌석 배열을 받아와서 색깔을 구분합니다.
function renderSeats(reservedSeats) {
    const container = document.getElementById('seatContainer');
    container.innerHTML = '';
    
    for (let i = 1; i <= 20; i++) {
        const seatNum = `S${i}`;
        const btn = document.createElement('button');
        btn.textContent = seatNum;
        
        // 이 좌석이 팔린 좌석 목록에 있다면?
        if (reservedSeats.includes(seatNum)) {
            btn.className = `seat w-12 h-12 rounded-lg border-2 font-bold OCCUPIED`;
            btn.disabled = true; // 클릭 완전 차단
        } 
        // 팔리지 않은 좌석이라면?
        else {
            btn.className = `seat w-12 h-12 rounded-lg border-2 font-bold AVAILABLE`;
            btn.onclick = () => {
                selectedSeat = { seat_num: seatNum };
                
                // 선택 효과(보라색) 적용
                document.querySelectorAll('.seat.AVAILABLE').forEach(s => s.classList.remove('SELECTED'));
                btn.classList.add('SELECTED');
                
                // 정보 패널 업데이트
                document.getElementById('infoSeat').textContent = btn.textContent;
                document.getElementById('infoPrice').textContent = `${perfInfo.price.toLocaleString()}원`;
                
                const rb = document.getElementById('btnReserve');
                rb.disabled = false;
                rb.className = "w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-lg py-4 rounded-xl transition-all shadow-lg shadow-purple-200 transform hover:-translate-y-1";
                rb.textContent = "결제하기";
            };
        }
        
        container.appendChild(btn);
    }
}

async function processReservation() {
    if (!selectedSeat) return;
    const reserveBtn = document.getElementById('btnReserve');
    reserveBtn.disabled = true;
    reserveBtn.textContent = "처리 중...";

    const payload = {
        user_id: sessionStorage.getItem('u_id'),
        seat_num: selectedSeat.seat_num, 
        perf_id: perfInfo.perf_id,
        perf_title: perfInfo.perf_title,
        select_date: perfInfo.select_date,
        select_time: perfInfo.select_time,
        place: perfInfo.place,
        price: perfInfo.price
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/reservations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (response.ok && result.status === 'success') {
            alert(result.message);
            safeNavigate('mypage.html');
        } else {
            alert(result.message + (result.waiting_number ? `\n(현재 대기 순위: ${result.waiting_number}번)` : ""));
            resetReserveButton(reserveBtn);
            
            // 🚨 만약 누군가 먼저 결제했다면 좌석을 새로고침해서 회색으로 만들어 줍니다.
            if (result.status === 'fail') {
                const updatedSeats = await fetchReservedSeats();
                renderSeats(updatedSeats);
                selectedSeat = null;
                document.getElementById('infoSeat').textContent = "-";
                document.getElementById('infoPrice').textContent = "0원";
            }
        }
    } catch (e) {
        console.error("통신 오류:", e);
        alert("서버 통신에 실패했습니다. 네트워크 상태나 IP를 확인해주세요.");
        resetReserveButton(reserveBtn);
    }
}

function resetReserveButton(btn) {
    btn.disabled = false;
    btn.innerHTML = "결제하기";
    btn.classList.remove('opacity-75', 'cursor-not-allowed');
}

function updateHeaderUI() { /* 유지 */ }
function handleLogout() { /* 유지 */ }