const API_KEY = "76bdb5ba111645e394169b887d8a5e33"; 
const parser = new DOMParser();
let currentGenre = ''; 

const categories = [
    { id: '', name: '전체', icon: '🎫', color: 'bg-gray-100' },
    { id: 'GGGA', name: '뮤지컬', icon: '💃', color: 'text-pink-800' },
    { id: 'AAAA', name: '연극', icon: '🎭', color: 'bg-orange-100' },
    { id: 'CCCC', name: '국악', icon: '🪘', color: 'bg-green-100' },
    { id: 'BBBC', name: '무용', icon: '🩰', color: 'bg-purple-100' },
    { id: 'CCCA', name: '클래식', icon: '🎻', color: 'bg-blue-100' },
];

const endDate = new Date();
const startDate = new Date();
startDate.setMonth(endDate.getMonth() - 1);
const stdateStr = startDate.toISOString().split('T')[0].replace(/-/g, '');
const eddateStr = endDate.toISOString().split('T')[0].replace(/-/g, '');

window.onload = async () => {
    renderCategories();
    renderTabs();
    lucide.createIcons();
    await refreshData();

    // 윈도우 리사이즈 시 슬라이드 버튼 상태 업데이트
    window.addEventListener('resize', updateScrollButtons);
};

// 마이, 찜, 장바구니 클릭 시 로그인 상태를 확인하는 함수
function checkLoginAndRedirect(targetPage) {
    // 💡 실제 서비스에서는 서버 세션(Session)이나 쿠키, 로컬스토리지의 토큰 유무로 검사합니다.
    // 여기서는 테스트를 위해 localStorage의 'isLoggedIn' 값을 확인합니다.
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    if (isLoggedIn) {
        // 로그인이 되어 있다면 원래 가려던 페이지로 이동
        window.location.href = targetPage;
    } else {
        // 로그인이 안 되어 있다면 알림을 띄우고 로그인 페이지로 이동
        alert('로그인이 필요한 서비스입니다. 로그인 페이지로 이동합니다.');
        window.location.href = 'login.html'; 
    }
}

function renderCategories() {
    const container = document.getElementById('categoryMenu');
    container.innerHTML = categories.map(cat => `
        <div class="flex flex-col items-center gap-3 cursor-pointer group" onclick="changeCategory('${cat.id}')">
            <div class="w-16 h-16 rounded-full ${cat.color} flex items-center justify-center text-3xl shadow-sm group-hover:shadow-md transition-all group-hover:-translate-y-1">
                ${cat.icon}
            </div>
            <span class="text-sm font-medium text-gray-700 group-hover:text-purple-600 transition-colors">${cat.name}</span>
        </div>
    `).join('');
}

function renderTabs() {
    const container = document.getElementById('tabMenu');
    container.innerHTML = categories.map(cat => {
        const isActive = cat.id === currentGenre;
        const activeClass = isActive ? 'bg-gray-900 text-white font-bold shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200';
        return `<button onclick="changeCategory('${cat.id}')" class="px-5 py-2 rounded-full text-sm whitespace-nowrap transition-all ${activeClass}">${cat.name}</button>`;
    }).join('');
}

// js/app.js 어딘가에 있을 함수 예시
function fetchAllData() {
    // 날짜 입력값 가져오기 (값이 없으면 기본값 설정)
    const sDate = document.getElementById('startDate').value;
    const eDate = document.getElementById('endDate').value;
    
    if(sDate) stdateStr = sDate.replace(/-/g, '');
    if(eDate) eddateStr = eDate.replace(/-/g, '');

    // 리스트들과 랭킹 갱신
    fetchBoxOffice();
    fetchPerformanceList();
}

async function changeCategory(genreId) {
    currentGenre = genreId;
    renderTabs(); 
    
    const listTitle = document.getElementById('listTitle');
    const genreName = categories.find(c => c.id === genreId)?.name || '전체';
    listTitle.innerHTML = `<span class="text-purple-600">${genreName}</span> 추천 공연`;

    const boxOffice = document.getElementById('boxOfficeList');
    const perfList = document.getElementById('performanceList');
    boxOffice.innerHTML = '<div class="text-gray-400 py-10 w-full text-center">데이터를 불러오는 중...</div>';
    perfList.innerHTML = '<div class="text-gray-400 py-10 w-full col-span-full text-center">데이터를 불러오는 중...</div>';

    await refreshData();
}

async function refreshData() {
    await Promise.all([fetchBoxOffice(), fetchPerformanceList()]);
    
    const loader = document.getElementById('loader');
    if (loader && loader.style.display !== 'none') {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 700);
    }
}

// 스마트 가로 스크롤 로직
function scrollBoxOffice(direction) {
    const container = document.getElementById('boxOfficeList');
    const scrollAmount = container.clientWidth * 0.8; 
    
    if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
}

function updateScrollButtons() {
    const container = document.getElementById('boxOfficeList');
    const leftBtn = document.getElementById('btn-scroll-left');
    const rightBtn = document.getElementById('btn-scroll-right');
    
    if (!container || !leftBtn || !rightBtn) return;
    
    // 맨 왼쪽에 도달하면 왼쪽 화살표 숨김
    if (container.scrollLeft <= 10) {
        leftBtn.classList.add('scroll-btn-disabled');
    } else {
        leftBtn.classList.remove('scroll-btn-disabled');
    }
    
    // 맨 오른쪽에 도달하면 오른쪽 화살표 숨김
    if (Math.ceil(container.scrollLeft + container.clientWidth) >= container.scrollWidth - 10) {
        rightBtn.classList.add('scroll-btn-disabled');
    } else {
        rightBtn.classList.remove('scroll-btn-disabled');
    }
}

async function fetchBoxOffice() {
    const container = document.getElementById('boxOfficeList');
    // stdateStr, eddateStr, currentGenre 변수가 외부(전역)에 정의되어 있어야 합니다.
    let url = `https://corsproxy.io/?${encodeURIComponent(`http://www.kopis.or.kr/openApi/restful/boxoffice?service=${API_KEY}&stdate=${stdateStr}&eddate=${eddateStr}&catecode=${currentGenre}`)}`;

    try {
        const res = await fetch(url);
        const xml = parser.parseFromString(await res.text(), "text/xml");
        const items = xml.getElementsByTagName("boxof");
        container.innerHTML = '';

        if(items.length === 0) {
            container.innerHTML = '<div class="text-gray-400 py-10 text-center w-full">해당 장르의 랭킹 데이터가 없습니다.</div>';
            return;
        }

        for (let i = 0; i < Math.min(items.length, 10); i++) {
            const id = items[i].getElementsByTagName("mt20id")[0].textContent;
            const title = items[i].getElementsByTagName("prfnm")[0].textContent;
            const poster = items[i].getElementsByTagName("poster")[0].textContent;
            const rank = items[i].getElementsByTagName("rnum")[0].textContent;
            const period = items[i].getElementsByTagName("prfpd")[0]?.textContent || '';

            // [수정 포인트] onclick 이벤트에 location.href를 직접 연결하여 페이지 이동
            container.innerHTML += `
                <div onclick="location.href='detail.html?id=${id}'" class="w-[240px] md:w-[280px] flex-shrink-0 cursor-pointer group snap-start">
                    <div class="relative rounded-2xl overflow-hidden mb-4 shadow-sm">
                        <img src="${poster}" alt="${title}" class="w-full aspect-[3/4] object-cover hover-scale transition-transform duration-500 group-hover:scale-110" onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'">
                        <div class="absolute top-0 left-0 bg-black/80 text-white font-black text-xl w-12 h-12 flex items-center justify-center rounded-br-2xl backdrop-blur-sm">
                            ${rank}
                        </div>
                    </div>
                    <h3 class="font-bold text-gray-900 text-lg truncate mb-1 group-hover:text-purple-600 transition-colors">${title}</h3>
                    <p class="text-sm text-gray-500 truncate">${period}</p>
                </div>
            `;
        }

        // 스크롤 버튼 업데이트 로직 유지
        setTimeout(() => {
            if (typeof updateScrollButtons === 'function') {
                updateScrollButtons();
                container.removeEventListener('scroll', updateScrollButtons); 
                container.addEventListener('scroll', updateScrollButtons);
            }
        }, 100);

    } catch (e) { 
        console.error("BoxOffice Error:", e); 
        container.innerHTML = '<div class="text-red-400 py-10">데이터를 불러오는데 실패했습니다.</div>';
    }
}

async function fetchPerformanceList() {
    const container = document.getElementById('performanceList');
    // stdateStr, eddateStr, currentGenre 등의 전역 변수값이 실시간으로 반영됩니다.
    let url = `https://corsproxy.io/?${encodeURIComponent(`http://www.kopis.or.kr/openApi/restful/pblprfr?service=${API_KEY}&stdate=${stdateStr}&eddate=${eddateStr}&shcate=${currentGenre}&cpage=1&rows=15`)}`;

    try {
        const res = await fetch(url);
        const xml = parser.parseFromString(await res.text(), "text/xml");
        const items = xml.getElementsByTagName("db");
        container.innerHTML = '';

        if(items.length === 0) {
            container.innerHTML = '<div class="text-gray-400 py-10 col-span-full text-center">진행중인 공연이 없습니다.</div>';
            return;
        }

        for (let i = 0; i < items.length; i++) {
            const id = items[i].getElementsByTagName("mt20id")[0].textContent;
            const title = items[i].getElementsByTagName("prfnm")[0].textContent;
            const poster = items[i].getElementsByTagName("poster")[0].textContent;
            const venue = items[i].getElementsByTagName("fcltynm")[0].textContent;
            const state = items[i].getElementsByTagName("prfstate")[0].textContent;

            let badgeColor = 'bg-gray-100 text-gray-600';
            if(state.includes('공연중')) badgeColor = 'bg-purple-100 text-purple-700';
            else if(state.includes('예정')) badgeColor = 'bg-blue-100 text-blue-700';

            // [수정 포인트] onclick="location.href='detail.html?id=${id}'" 적용
            container.innerHTML += `
                <div onclick="location.href='detail.html?id=${id}'" class="cursor-pointer group flex flex-col">
                    <div class="relative rounded-xl overflow-hidden mb-3 shadow-sm border border-gray-100">
                        <img src="${poster}" alt="${title}" class="w-full aspect-[3/4] object-cover transition-transform duration-500 group-hover:scale-105" onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'">
                        <div class="absolute bottom-2 left-2 ${badgeColor} text-[10px] font-bold px-2 py-1 rounded shadow-sm backdrop-blur-sm bg-opacity-90">
                            ${state}
                        </div>
                    </div>
                    <h3 class="font-bold text-gray-900 text-sm h-10 line-clamp-2 leading-snug mb-1 group-hover:text-purple-600 transition-colors">
                        ${title}
                    </h3>
                    <p class="text-[11px] text-gray-400 truncate mt-auto">
                        <i data-lucide="map-pin" class="inline w-3 h-3 mr-0.5"></i>${venue}
                    </p>
                </div>
            `;
        }
        
        // Lucide 아이콘이 새로 그려지도록 호출 (아이콘을 추가한 경우)
        if (typeof lucide !== 'undefined') lucide.createIcons();

    } catch (e) { 
        console.error("List Error:", e);
        container.innerHTML = '<div class="text-red-400 py-10 col-span-full">데이터를 불러오는데 실패했습니다.</div>';
    }
}

async function openDetail(id) {
    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden'; 

    content.innerHTML = `<div class="p-20 text-center flex flex-col items-center justify-center"><div class="pastel-loader mb-4"></div><p class="text-purple-600 font-bold">상세 정보를 불러오는 중...</p></div>`;

    try {
        const url = `https://corsproxy.io/?${encodeURIComponent(`http://www.kopis.or.kr/openApi/restful/pblprfr/${id}?service=${API_KEY}`)}`;
        const res = await fetch(url);
        const xml = parser.parseFromString(await res.text(), "text/xml");
        const db = xml.getElementsByTagName("db")[0];

        const prfnm = db.getElementsByTagName("prfnm")[0].textContent;
        const poster = db.getElementsByTagName("poster")[0].textContent;
        const fcltynm = db.getElementsByTagName("fcltynm")[0].textContent;
        const prfpd = `${db.getElementsByTagName("prfpdfrom")[0].textContent} ~ ${db.getElementsByTagName("prfpdto")[0].textContent}`;
        const pcse = db.getElementsByTagName("pcseguidance")[0].textContent;
        const cast = db.getElementsByTagName("prfcast")[0]?.textContent || '정보 없음';
        const runtime = db.getElementsByTagName("prfruntime")[0]?.textContent || '정보 없음';

        content.innerHTML = `
            <div class="relative flex flex-col md:flex-row w-full">
                <button onclick="closeModal()" class="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur rounded-full p-2 hover:bg-gray-100 transition shadow-sm">
                    <i data-lucide="x" class="w-5 h-5 text-gray-700"></i>
                </button>
                
                <div class="w-full md:w-2/5 bg-gray-50 p-6 flex justify-center items-center">
                    <img src="${poster}" class="w-2/3 md:w-full max-w-sm rounded-xl shadow-lg" alt="${prfnm}">
                </div>
                
                <div class="w-full md:w-3/5 p-8 md:p-10 flex flex-col">
                    <span class="inline-block bg-purple-100 text-purple-600 text-xs font-bold px-3 py-1 rounded-full w-max mb-4">공연 상세</span>
                    <h2 class="text-2xl md:text-3xl font-black text-gray-900 mb-6 leading-tight">${prfnm}</h2>
                    
                    <div class="space-y-4 text-sm text-gray-600 flex-1">
                        <div class="flex border-b border-gray-100 pb-3">
                            <span class="w-20 font-bold text-gray-400">기간</span>
                            <span class="flex-1 font-medium text-gray-800">${prfpd}</span>
                        </div>
                        <div class="flex border-b border-gray-100 pb-3">
                            <span class="w-20 font-bold text-gray-400">장소</span>
                            <span class="flex-1 font-medium text-gray-800">${fcltynm}</span>
                        </div>
                        <div class="flex border-b border-gray-100 pb-3">
                            <span class="w-20 font-bold text-gray-400">관람시간</span>
                            <span class="flex-1 font-medium text-gray-800">${runtime}</span>
                        </div>
                        <div class="flex border-b border-gray-100 pb-3">
                            <span class="w-20 font-bold text-gray-400">출연진</span>
                            <span class="flex-1 font-medium text-gray-800 truncate-2-lines">${cast}</span>
                        </div>
                        <div class="flex border-b border-gray-100 pb-3">
                            <span class="w-20 font-bold text-gray-400">가격</span>
                            <span class="flex-1 font-bold text-purple-600">${pcse}</span>
                        </div>
                    </div>
                    
                    <div class="mt-8 pt-4 flex gap-3">
                        <button class="w-14 h-14 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-500 transition-colors">
                            <i data-lucide="heart"></i>
                        </button>
                        <button class="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-lg transition-colors shadow-md shadow-purple-200">
                            예매하기
                        </button>
                    </div>
                </div>
            </div>
        `;
        lucide.createIcons();
    } catch (e) { 
        content.innerHTML = `<div class="p-20 text-center text-red-500">정보를 불러올 수 없습니다.<br><button onclick="closeModal()" class="mt-4 px-4 py-2 bg-gray-100 rounded text-gray-700">닫기</button></div>`; 
    }
}

function closeModal() {
    const modal = document.getElementById('modal-container');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = 'auto'; 
}