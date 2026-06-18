export default function middleware(request) {
  const authorization = request.headers.get('authorization');

  if (authorization) {
    // Rompemos el texto encriptado que manda el navegador
    const authValue = authorization.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

    // CAMBIA TU CONTRASEÑA AQUÍ (El usuario puede ser cualquiera):
    if (pwd === 'ORANTE') {
      // Si la contraseña es correcta, permite el paso
      return new Response(null, {
        headers: { 'x-middleware-next': '1' }
      });
    }
  }

  // Si no hay clave, lanza la ventana flotante del navegador
  return new Response('Se requiere autenticación', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Zona Protegida"'
    }
  });
}
