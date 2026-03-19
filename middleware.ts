export const config = {
  matcher: '/', // 告訴小助手：只需要在客人訪問首頁時啟動就好
};

export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const imgParam = url.searchParams.get('img'); // 抓取網址裡的 img 小尾巴

  // 如果網址沒有小尾巴，小助手就不做事，直接放行
  if (!imgParam) {
    return; 
  }

  // 1. 小助手先自己去把 index.html 抓出來
  const response = await fetch(request);
  let html = await response.text();

  // 2. 準備替換的魔法
  const defaultImage = "https://i.postimg.cc/mgbGJqQb/Gemini-Generated-Image-6s9pdc6s9pdc6s9p.png";
  
  // 🌟 關鍵替換動作
  html = html.replace(defaultImage, imgParam);

  // 3. 把改好的 HTML 交給 LINE 機器人
  return new Response(html, {
    headers: {
      'content-type': 'text/html;charset=UTF-8',
    },
  });
}