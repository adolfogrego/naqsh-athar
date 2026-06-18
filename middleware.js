export default function middleware(request) {
  const authorization = request.headers.get('authorization');

  if (authorization) {
    const authValue = authorization.split(' ');
    
    // Desencriptamos los datos del cuadro de diálogo
    const decoded = atob(authValue[1]).split(':');
    
    // El segundo elemento [1] es siempre la contraseña
    const pwd = decoded[1];

    // COLOCA TU CONTRASEÑA AQUÍ:
    if (pwd === 'ORANTE') {
      return new Response(null, {
        headers: { 'x-middleware-next': '1' }
      });
    }
  }

  // Si no hay contraseña o es incorrecta, vuelve a pedirla
  return new Response('Se requiere autenticación', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Zona Protegida. Pon solo la contraseña y deja el usuario vacío."'
    }
  });
}
