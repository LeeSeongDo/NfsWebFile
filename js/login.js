// 1. 페이지 로드 시 초기 세션 체크 (이미 로그인했다면 메인으로 이동)
if (sessionStorage.getItem('ename')) {
    alert("이미 로그인 상태입니다. 메인페이지로 이동합니다.");
    location.href = "./index.html";
}

// 2. 실제 로그인 통신 함수
async function handleLogin() {
    const idInput = document.getElementById('employeeId').value;
    const pwInput = document.getElementById('password').value;
    const message = document.getElementById('pw-message');
    
    // [Step 1] 백엔드(FastAPI Form) 규격에 맞게 FormData 객체 생성
    const formData = new FormData();
    formData.append('u_id', idInput);
    formData.append('u_pass', pwInput);

    try {
        message.textContent = "서버와 통신 중...";
        message.style.color = "#3498db";

        // [Step 2] WAS 서버로 POST 요청 (Content-Type 헤더 생략 필수 🚨)
        const res = await fetch('http://10.4.0.201/api/member/login', { 
            method: 'POST', 
            body: formData, // 브라우저가 자동으로 multipart/form-data 및 boundary를 설정함
            credentials: 'include'
        });

        // [Step 3] JSON 응답 파싱
        const result = await res.json();

        // 🔍 [디버깅] 서버 응답 확인용 (운영 배포 시 삭제하세요)
        console.log("디버깅 - 서버 응답:", result);

        if (result.status === "success") {
            // [Step 4] 로그인 성공 시 세션 스토리지에 정보 저장 및 페이지 이동
            sessionStorage.setItem('ename', result.nickname);
            sessionStorage.setItem('u_id', idInput);
            
            alert(result.message); // 예: "OOO님 환영합니다!"
            location.href = './index.html';
        } else {
            // [Step 5] 로그인 실패 처리 (아이디/비번 불일치 등)
            message.textContent = result.message || "로그인 실패";
            message.style.color = "#ff4d4d";
            alert("로그인 실패: " + result.message);
        }
    } catch (error) {
        // [Step 6] 네트워크 오류 등 서버 접속 실패 처리
        console.error("통신 오류:", error);
        message.textContent = "서버 연결 실패 (네트워크 확인)";
        message.style.color = "#ff4d4d";
        alert("WAS 서버(10.4.0.201)에 연결할 수 없습니다.\n서버 실행 여부를 확인하세요.");
    }
}

// ---------------------------------------------------------
// [추가된 기능] 유효성 검사 및 이벤트 처리 로직
// ---------------------------------------------------------

// 정규식 정의
const idRegex = /^[a-zA-Z0-9]{5,}$/; // 5자 이상 영문/숫자
const pwRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/; // 8자 이상 영문/숫자/특수문자

// 유효성 검사를 수행하고 통과하면 handleLogin()을 호출하는 공통 함수
function executeLoginValidation() {
    const idInput = document.getElementById('employeeId');
    const pwInput = document.getElementById('password');
    const message = document.getElementById('pw-message');
    
    // 1. 아이디 유효성 검사
    if (!idRegex.test(idInput.value)) {
        message.textContent = "아이디는 5자 이상의 영문/숫자여야 합니다.";
        message.style.color = "#ff4d4d";
        idInput.focus(); // 아이디 창으로 커서 이동
        return; 
    }

    // 2. 비밀번호 유효성 검사
    if (!pwRegex.test(pwInput.value)) {
        message.textContent = "비밀번호는 영문, 숫자, 특수문자 포함 8자 이상이어야 합니다.";
        message.style.color = "#ff4d4d";
        pwInput.focus(); // 비밀번호 창으로 커서 이동
        return; 
    }

    // 유효성 검사 통과 시 실제 로그인 통신 실행
    handleLogin();
}

// 3. 버튼 클릭 이벤트 연결
document.getElementById('loginBtn').addEventListener('click', executeLoginValidation);

// 4. Enter 키 이벤트 연결 (아이디 입력창, 비밀번호 입력창 모두 적용)
document.getElementById('employeeId').addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
        executeLoginValidation();
    }
});

document.getElementById('password').addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
        executeLoginValidation();
    }
});