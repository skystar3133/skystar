// 문의하기 폼 클라이언트

const CONTACT_API_URL = 'https://skystar-backend.vercel.app/api/contact';
const KAKAO_CLICK_NOTIFY_URL = 'https://skystar-backend.vercel.app/api/kakao-click-notify';
const KAKAO_OPEN_CHAT_URL = 'https://open.kakao.com/o/syNnsvCh';

// 카카오톡 오픈채팅으로 이동하는 버튼/링크를 눌렀을 때 텔레그램으로 알림
// - sendBeacon은 클릭 직후 새 탭/페이지 이동이 일어나도 요청이 끊기지 않도록 브라우저가 보장해준다
function notifyKakaoClick() {
  if (navigator.sendBeacon) {
    navigator.sendBeacon(KAKAO_CLICK_NOTIFY_URL);
    return;
  }
  fetch(KAKAO_CLICK_NOTIFY_URL, { method: 'POST', keepalive: true }).catch(error => {
    console.error('Error notifying kakao click:', error);
  });
}

document.addEventListener('click', function (event) {
  const kakaoEl = event.target.closest(`a[href="${KAKAO_OPEN_CHAT_URL}"], .hnb-speed-btn`);
  if (kakaoEl) {
    notifyKakaoClick();
  }
});

async function submitContactForm(event) {
  event.preventDefault();

  const form = event.target;
  const name = form.name.value.trim();
  const phone = form.phone.value.trim();
  const message = form.message.value.trim();

  if (!name || !phone || !message) {
    alert('이름, 연락처, 문의내용을 모두 입력해주세요.');
    return;
  }

  try {
    const response = await fetch(CONTACT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, message }),
    });

    if (!response.ok) throw new Error('문의 전송 실패');

    alert('문의가 접수되었습니다. 확인 후 연락드리겠습니다.');
    form.reset();
  } catch (error) {
    console.error('Error submitting contact form:', error);
    alert('문의 전송에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }
}
