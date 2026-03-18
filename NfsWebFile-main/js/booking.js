let perfInfo = {};
let selectedSeat = null;

function safeNavigate(url) { window.location.href = url; }

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

    const reservedSeats = await fetchReservedSeats();
    renderSeats(reservedSeats);
});

async function fetchReservedSeats() {
    try {
        // 💡 하드코딩 IP 제거, Nginx로 바로 쏘는 상대경로 적용
        const url = `/api/reservations/seats?perf_id=${perfInfo.perf_id}&date=${perfInfo.select_date}&time=${perfInfo.select_time}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.status === 'success') {
            return data.reserved_seats;
        }
    } catch (e) {
        console.error("예약된 좌석 정보 로딩 실패:", e);
    }
    return []; 
}

function renderSeats(reservedSeats) {
    const container = document.getElementById('seatContainer');
    container.innerHTML = '';
    
    for (let i = 1; i <= 20; i++) {
        const seatNum = `S${i}`;
        const btn = document.createElement('button');
        btn.textContent = seatNum;
        
        if (reservedSeats.includes(seatNum)) {
            btn.className = `seat w-12 h-12 rounded-lg border-2 font-bold OCCUPIED`;
            btn.disabled = true; 
        } else {
            btn.className = `seat w-12 h-12 rounded-lg border-2 font-bold AVAILABLE`;
            btn.onclick = () => {
                selectedSeat = { seat_num: seatNum };
                
                document.querySelectorAll('.seat.AVAILABLE').forEach(s => s.classList.remove('SELECTED'));
                btn.classList.add('SELECTED');
                
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
        // 💡 하드코딩 IP 제거
        const response = await fetch(`/api/reservations`, {
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
        alert(`서버 통신에 실패했습니다.`);
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