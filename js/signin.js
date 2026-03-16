const signupForm = document.getElementById('signupForm');
const submitBtn = document.getElementById('submitBtn');

// 각 입력 필드와 메시지 요소 세팅
const fields = {
    userId: { el: document.getElementById('userId'), msg: document.getElementById('idMsg'), regex: /^[a-zA-Z0-9]{5,}$/, error: "5자 이상의 영문/숫자여야 합니다." },
    email: { el: document.getElementById('userEmail'), msg: document.getElementById('emailMsg'), regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, error: "유효한 이메일 형식이 아닙니다." },
    pw: { el: document.getElementById('password'), msg: document.getElementById('pwMsg'), regex: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/, error: "영문/숫자/특수문자 포함 8자 이상이어야 합니다." }
};

const confirmPw = document.getElementById('passwordConfirm'); // HTML ID와 일치시킴
const confirmMsg = document.getElementById('confirmMsg');

// 통합 유효성 검사 함수
function validate() {
    let isAllValid = true;

    // 1. 기본 정규식 검사
    for (let key in fields) {
        const item = fields[key];
        if (item.regex.test(item.el.value)) {
            item.msg.textContent = "사용 가능합니다.";
            item.msg.className = "msg success";
            item.msg.style.color = "green"; // 시각적 피드백
        } else {
            item.msg.textContent = item.el.value ? item.error : "";
            item.msg.className = "msg error";
            item.msg.style.color = "red";
            isAllValid = false;
        }
    }

    // 2. 비밀번호 재확인 검사
    if (fields.pw.el.value === confirmPw.value && confirmPw.value !== "") {
        confirmMsg.textContent = "비밀번호가 일치합니다.";
        confirmMsg.className = "msg success";
        confirmMsg.style.color = "green";
    } else {
        confirmMsg.textContent = confirmPw.value ? "비밀번호가 일치하지 않습니다." : "";
        confirmMsg.className = "msg error";
        confirmMsg.style.color = "red";
        isAllValid = false;
    }

    // 3. 이름, 주소, 전화번호 빈 값 체크 (간단한 추가 검증)
    const nameVal = document.getElementById('userName').value;
    const addrVal = document.getElementById('userAddress').value;
    const phoneVal = document.getElementById('userPhone').value;
    if(!nameVal || !addrVal || !phoneVal) {
        isAllValid = false;
    }

    // 모든 조건 충족 시 버튼 활성화
    submitBtn.disabled = !isAllValid;
}

// 실제 백엔드로 회원가입 요청을 보내는 함수
async function register() {
    const formData = new FormData();
    
    // 백엔드 signin.py의 매개변수(user_id, password, user_name, phone, addr, email)와 정확히 일치해야 함
    formData.append('user_id', document.getElementById('userId').value);
    formData.append('password', document.getElementById('password').value);
    formData.append('user_name', document.getElementById('userName').value);
    formData.append('phone', document.getElementById('userPhone').value);
    formData.append('addr', document.getElementById('userAddress').value);
    formData.append('email', document.getElementById('userEmail').value);

    try {
        // 백엔드 라우터 주소로 변경
        const res = await fetch('http://10.4.0.201/api/member/register', { 
            method: 'POST', 
            body: formData 
        });
        
        const result = await res.json();
        console.log("Server Response:", result);
        
        // 백엔드에서 {"status": "success"} 를 내려준 경우
        if(result.status === 'success') {
            alert(result.message); // "가입되었습니다"
            location.href = './login.html'; // 로그인 페이지로 이동
        } else {
            // 아이디 중복 등 실패 메시지 처리
            alert(result.message);
        }
    } catch (error) {
        console.error('Fetch Error:', error);
        alert('서버와 통신 중 문제가 발생했습니다.');
    }
}

// 이벤트 리스너 등록 (실시간 검사)
Object.values(fields).forEach(item => item.el.addEventListener('input', validate));
confirmPw.addEventListener('input', validate);

// 이름, 주소, 전화번호 입력 시에도 버튼 활성화 여부 체크를 위해 리스너 추가
document.getElementById('userName').addEventListener('input', validate);
document.getElementById('userAddress').addEventListener('input', validate);
document.getElementById('userPhone').addEventListener('input', validate);

// 폼 제출 이벤트 (Submit 버튼 클릭 시)
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // 새로고침 방지
    await register();   // 백엔드 전송 함수 호출
});
