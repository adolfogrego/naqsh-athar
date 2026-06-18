import { NextResponse } from 'next/server'

export function middleware(req) {
  const basicAuth = req.headers.get('authorization')

  if (basicAuth) {
    // Tomamos la parte encriptada (quitando la palabra "Basic")
    const authValue = basicAuth.split(' ')[1]
    
    // Desencriptamos el texto para obtener el usuario y la clave
    const decoded = atob(authValue).split(':')
    const pwd = decoded[1]

    // CAMBIA TU CONTRASEÑA AQUÍ:
    if (pwd === 'ORANTE') {
      return NextResponse.next()
    }
  }

  // Si no hay contraseña o es incorrecta, bloquea la pantalla
  return new NextResponse('Se requiere autenticación', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Zona Protegida"',
    },
  })
}

// Configuración para proteger todo el sitio web
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
