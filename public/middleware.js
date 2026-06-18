import { NextResponse } from 'next/server'

export function middleware(req) {
  const basicAuth = req.headers.get('authorization')

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1]
    // El navegador junta el usuario y la clave separados por un bicho de dos puntos (:)
    // Con split(':') los separamos. El [1] significa que solo nos importa la contraseña.
    const pwd = atob(authValue).split(':')[1]

    // COLOCA TU CONTRASEÑA AQUÍ:
    if (pwd === 'ORANTE') {
      return NextResponse.next()
    }
  }

  // Si la clave no es correcta, vuelve a pedirla
  return new NextResponse('Se requiere autenticación', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Zona Protegida"',
    },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
