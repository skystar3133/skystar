// 문의하기 폼 클라이언트

const CONTACT_API_URL = 'https://skystar-backend.vercel.app/api/contact';

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
