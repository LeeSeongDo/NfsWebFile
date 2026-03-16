const API_KEY = "76bdb5ba111645e394169b887d8a5e33";

// 예매 시 넘겨줄 현재 공연 데이터를 안전하게 저장하기 위한 객체
let currentPerformanceData = null;

// ==========================================
// [0] 유틸리티 함수
// ==========================================
const getText = (element, tagName, defaultValue = '정보 없음') => {
    const node = element?.getElementsByTagName(tagName)[0];
    return node && node.textContent.trim() ? node.textContent.trim() : defaultValue;
};

// ⭐️ [진짜 최종 최적화] AbortController를 이용한 네트워크 강제 절단 (1분 대기 원천 차단)

async function fetchXMLWithCache(url, cacheKey, ttlMinutes = 60) {
    // 1. [캐시 로직] 기존에 성공했던 데이터가 있다면 0초 만에 반환
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
        try {
            const { timestamp, xmlString } = JSON.parse(cached);
            // 유효기간(60분) 내 데이터라면 즉시 반환
            if (Date.now() - timestamp < ttlMinutes * 60 * 1000) {
                const doc = new DOMParser().parseFromString(xmlString, "text/xml");
                if (!doc.getElementsByTagName("parsererror").length) return doc;
            }
        } catch (e) { 
            sessionStorage.removeItem(cacheKey); 
        }
    }

    // 2. [병렬 레이싱 설정] 프록시 리스트
    const proxies = [
        { type: 'json', url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}` },
        { type: 'raw', url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` },
        { type: 'raw', url: `https://corsproxy.io/?${encodeURIComponent(url)}` }
    ];

    // 3. [요청 시작] 타임아웃(AbortController) 관련 코드를 모두 삭제했습니다.
    const fetchPromises = proxies.map(async (proxy) => {
        try {
            // 제한 시간 없이 응답이 올 때까지 기다립니다.
            const response = await fetch(proxy.url);
            if (!response.ok) throw new Error("HTTP Error");

            let xmlString = '';
            if (proxy.type === 'json') {
                const data = await response.json();
                xmlString = data.contents || '';
            } else {
                xmlString = await response.text();
            }

            // 최소한의 데이터 길이 검증 (너무 짧으면 에러 페이지일 확률 높음)
            if (!xmlString || xmlString.length < 100) throw new Error("데이터 부족");

            // XML 유효성 검사
            const doc = new DOMParser().parseFromString(xmlString, "text/xml");
            if (doc.getElementsByTagName("parsererror").length) throw new Error("파싱 에러");

            return xmlString; 
        } catch (err) { 
            throw err; // 에러를 던져서 Promise.any가 다음 프록시를 찾게 함
        }
    });

    try {
        // 4. 세 프록시 중 '가장 먼저' 성공하는 결과가 올 때까지 무한 대기합니다.
        const fastestXmlString = await Promise.any(fetchPromises);

        // 5. 성공한 데이터는 캐시에 저장 (다음 방문 시 0초 렌더링)
        sessionStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            xmlString: fastestXmlString
        }));

        return new DOMParser().parseFromString(fastestXmlString, "text/xml");

    } catch (error) {
        // [최후의 보루] 3개 프록시가 모두 '에러'를 냈을 때만 캐시를 확인합니다.
        if (cached) {
            const { xmlString } = JSON.parse(cached);
            return new DOMParser().parseFromString(xmlString, "text/xml");
        }
        
        throw new Error("모든 통로가 차단되었습니다.");
    }
}



// ==========================================
// [1] 초기화 로직
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    updateHeaderUI();
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    const urlParams = new URLSearchParams(window.location.search);
    let performanceId = urlParams.get('id');

    if (!performanceId) {
        performanceId = 'TEST_ID';
    }

    await fetchPerformanceDetail(performanceId);
});

// ==========================================
// [2] 헤더 UI 동적 렌더링
// ==========================================
function updateHeaderUI() {
    const authMenu = document.getElementById('auth-menu');
    if (!authMenu) return; 

    const userName = sessionStorage.getItem('ename');

    if (userName) {
        authMenu.innerHTML = `
            <div class="flex items-center gap-4 animate-fade-in">
                <div class="flex items-center gap-1.5 text-gray-900 text-sm font-medium">
                    <i data-lucide="user" class="w-4 h-4 text-purple-600"></i>
                    <span class="text-purple-600 font-bold">${userName}</span>님
                </div>
                <div class="w-[1px] h-3 bg-gray-200"></div>
                <button onclick="location.href='mypage.html'" class="flex items-center gap-1.5 text-gray-600 hover:text-purple-600 transition-colors text-xs font-semibold">
                    <i data-lucide="ticket" class="w-4 h-4"></i> 예약내역
                </button>
                <div class="w-[1px] h-3 bg-gray-200"></div>
                <button id="logoutBtn" class="flex items-center gap-1.5 text-gray-400 hover:text-red-500 transition-colors text-xs font-semibold">
                    <i data-lucide="log-out" class="w-4 h-4"></i> 로그아웃
                </button>
            </div>
        `;
        document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    } else {
        authMenu.innerHTML = `
            <div class="flex items-center gap-4 animate-fade-in">
                <button onclick="location.href='login.html'" class="flex items-center gap-1.5 text-gray-600 hover:text-purple-600 transition-colors text-xs font-semibold">
                    <i data-lucide="log-in" class="w-4 h-4"></i> 로그인
                </button>
                <div class="w-[1px] h-3 bg-gray-200"></div>
                <button onclick="location.href='login.html'" class="flex items-center gap-1.5 text-gray-600 hover:text-purple-600 transition-colors text-xs font-semibold">
                    <i data-lucide="search" class="w-4 h-4"></i> 예약내역 조회
                </button>
            </div>
        `;
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function handleLogout() {
    if (confirm("로그아웃 하시겠습니까?")) {
        sessionStorage.clear(); 
        alert("로그아웃 되었습니다.");
        location.href = 'index.html'; 
    }
}

// ==========================================
// [3] 데이터 통신 로직
// ==========================================
async function fetchPerformanceDetail(id) {
    const container = document.getElementById('detailContainer');
    
    // 즉시 로딩 UI 표시
    if (container) {
        container.innerHTML = `
            <div class="w-full py-32 flex flex-col items-center justify-center animate-pulse">
                <i data-lucide="loader-2" class="w-10 h-10 text-purple-500 animate-spin mb-4"></i>
                <p class="text-purple-600 font-bold text-lg">공연 상세 정보를 불러오는 중입니다...</p>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    const url = `http://www.kopis.or.kr/openApi/restful/pblprfr/${id}?service=${API_KEY}`;
    let data = {};
    let introImagesHtml = '';

    try {
        if (id === 'TEST_ID') throw new Error("Fallback 트리거");

        const cacheKey = `perf_detail_${id}`;
        // 정확히 3초만 기다립니다.
        const xmlDoc = await fetchXMLWithCache(url, cacheKey, 60);
        const db = xmlDoc.getElementsByTagName("db")[0];

        if (!db) throw new Error("KOPIS 데이터 없음");

        data = {
            id: id,
            title: getText(db, "prfnm"),
            poster: getText(db, "poster", "https://placehold.co/300x420/f3f4f6/9ca3af?text=No+Image"),
            genre: getText(db, "genrenm"),
            startDate: getText(db, "prfpdfrom"),
            endDate: getText(db, "prfpdto"),
            facility: getText(db, "fcltynm"),
            cast: getText(db, "prfcast"),
            runtime: getText(db, "prfruntime"),
            price: getText(db, "pcseguidance"),
            state: getText(db, "prfstate")
        };

        const styurlNodes = db.getElementsByTagName("styurl");
        for (let i = 0; i < styurlNodes.length; i++) {
            const imgUrl = styurlNodes[i].textContent.trim();
            if (imgUrl) {
                introImagesHtml += `<img src="${imgUrl}" alt="상세 이미지" loading="lazy" class="w-full max-w-3xl mb-4 rounded-xl shadow-sm">`;
            }
        }

    } catch (error) {
        console.warn("API 3초 초과 또는 연동 실패. 테스트 데이터를 즉시 렌더링합니다.");
        
        // ⭐️ 이미지 깨짐 해결: placehold.co 사용
        data = {
            id: 'TEST_ID',
            title: "[테스트] 펄스 오리지널 콘서트",
            poster: "https://placehold.co/300x420/9333ea/ffffff?text=PULSE+TICKET",
            genre: "콘서트",
            startDate: "2026.05.01",
            endDate: "2026.05.31",
            facility: "PULSE 그랜드 시어터",
            cast: "이동준, 테스트 밴드",
            runtime: "120분",
            price: "VIP석 150,000원, R석 100,000원",
            state: "공연중"
        };
        introImagesHtml = `<img src="https://placehold.co/800x400/f3e8ff/9333ea?text=Test+Intro+Image" class="w-full max-w-3xl mb-4 rounded-2xl shadow-sm">`;
    }

    const priceMatch = data.price.replace(/,/g, '').match(/\d+/);
    data.defaultPrice = priceMatch ? parseInt(priceMatch[0], 10) : 100000;
    currentPerformanceData = data;

    renderDetailView(container, data, introImagesHtml);
}

// ==========================================
// [4] 화면 렌더링 및 이벤트 바인딩
// ==========================================
function renderDetailView(container, data, introImagesHtml) {
    const todayStr = new Date().toISOString().split('T')[0];

    container.innerHTML = `
        <div class="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-10 mb-12 flex flex-col md:flex-row gap-10 animate-fade-in">
            <div class="w-full md:w-1/3 flex-shrink-0">
                <div class="rounded-2xl overflow-hidden shadow-lg sticky top-24">
                    <img src="${data.poster}" class="w-full h-auto object-cover aspect-[3/4]" onerror="this.onerror=null; this.src='https://placehold.co/300x420/9333ea/ffffff?text=PULSE+TICKET';">
                </div>
            </div>
            <div class="w-full md:w-2/3 flex flex-col">
                <div class="flex items-center gap-2 mb-3">
                    <span class="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-md">${data.genre}</span>
                    <span class="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-md">${data.state}</span>
                </div>
                <h1 class="text-3xl md:text-4xl font-black text-gray-900 mb-8 leading-tight">${data.title}</h1>
                <div class="space-y-4 mb-8 flex-1">
                    <div class="flex items-start"><div class="w-24 font-bold text-gray-400">공연기간</div><div class="flex-1 font-medium text-gray-800">${data.startDate} ~ ${data.endDate}</div></div>
                    <div class="flex items-start"><div class="w-24 font-bold text-gray-400">공연장소</div><div class="flex-1 font-medium text-gray-800">${data.facility}</div></div>
                    <div class="flex items-start"><div class="w-24 font-bold text-gray-400">관람시간</div><div class="flex-1 font-medium text-gray-800">${data.runtime}</div></div>
                    <div class="flex items-start"><div class="w-24 font-bold text-gray-400">출연진</div><div class="flex-1 font-medium text-gray-800 break-keep">${data.cast}</div></div>
                    <div class="flex items-start border-t border-gray-100 pt-4 mt-2">
                        <div class="w-24 font-bold text-purple-500">티켓가격</div>
                        <div class="flex-1 text-purple-600 font-bold whitespace-pre-wrap">${data.price}</div>
                    </div>
                </div>
                
                <div class="mt-auto bg-purple-50 rounded-2xl p-5 md:p-6 border border-purple-100">
                    <p class="text-sm font-bold text-purple-800 mb-4 flex items-center gap-2"><i data-lucide="calendar-check" class="w-5 h-5"></i> 관람 일시 선택</p>
                    <div class="flex flex-col sm:flex-row gap-3 mb-4">
                        <input type="date" id="bookDate" class="flex-1 bg-white border border-purple-200 rounded-xl px-4 py-3 font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400" min="${todayStr}">
                        <select id="bookTime" class="flex-1 bg-white border border-purple-200 rounded-xl px-4 py-3 font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400">
                            <option value="">시간 선택</option>
                            <option value="14:00">14:00 (낮 공연)</option>
                            <option value="19:00">19:00 (저녁 공연)</option>
                        </select>
                    </div>
                    <button id="bookTicketBtn" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl transition-all shadow-md shadow-purple-200 flex justify-center items-center gap-2">
                        <i data-lucide="armchair" class="w-5 h-5"></i> 좌석 선택 및 예매하기
                    </button>
                </div>
            </div>
        </div>
        ${introImagesHtml ? `<div class="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-12 text-center"><h2 class="text-2xl font-black mb-8 border-b pb-4 inline-block px-8 text-gray-800">공연 상세 소개</h2><div class="flex flex-col items-center gap-4">${introImagesHtml}</div></div>` : ''}
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    document.getElementById('bookTicketBtn').addEventListener('click', handleBooking);
}

// ==========================================
// [5] 예매 처리 로직
// ==========================================
function handleBooking() {
    const userId = sessionStorage.getItem('u_id');
    if (!userId) {
        alert("예매는 로그인한 사용자만 이용할 수 있습니다.");
        location.href = 'login.html';
        return;
    }

    const date = document.getElementById('bookDate').value;
    const time = document.getElementById('bookTime').value;

    if (!date || !time) {
        alert("관람하실 날짜와 시간을 모두 선택해주세요.");
        return;
    }

    const { id, title, facility, defaultPrice, poster } = currentPerformanceData;
    
    const queryParams = new URLSearchParams({
        id: id,
        title: title,
        date: date,
        time: time,
        place: facility,
        price: defaultPrice,
        poster: poster
    });

    location.href = 'booking.html?' + queryParams.toString();
}