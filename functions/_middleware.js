export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);

  // API / data fetching requests ko password se bypass karne ke liye
  if (url.pathname.startsWith('/api/')) {
    return context.next();
  }

  const Authorization = request.headers.get('Authorization');

  // All 14 accounts credentials
  const validCredentials = [
    'Basic ' + btoa('owner:hmh@8019'),                // Owner Login
    'Basic ' + btoa('ghazighat:Gg@1124'),
    'Basic ' + btoa('riazabad:Ra@1124'),
    'Basic ' + btoa('khanpur:Kp@1124'),
    'Basic ' + btoa('jeewana:Jb@1124'),
    'Basic ' + btoa('headbakaini:Hb@1124'),
    'Basic ' + btoa('headmwala:Hmw@1124'),
    'Basic ' + btoa('headpunjnad:Hp@1124'),
    'Basic ' + btoa('meerhaji:Mh@1124'),
    'Basic ' + btoa('headtounsa:Ht@1124'),
    'Basic ' + btoa('khanderm:Km@1124'),
    'Basic ' + btoa('gabbararain:Ga@1124'),
    'Basic ' + btoa('langarwah:Lw@1124'),
    'Basic ' + btoa('hamzaywali:Hw@1124')
  ];

  if (!Authorization || !validCredentials.includes(Authorization)) {
    return new Response('Access Denied: Authentication Required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Site Access"',
      },
    });
  }

  return context.next();
}
