import { NextResponse } from 'next/server'

export function middleware(req) {
  const basicAuth = req.headers.get('authorization')

  if (basicAuth) {
    // .split(' ')[1] elimina la palabra "Basic " para leer solo el texto secreto
    const authValue = basicAuth.split(' ')[1]
    
    // Desencripta los datos ingresados
    const [user, pwd] = atob(authValue).split(':')

    // CAMBIA TU CONTRASEÑA AQUÍ:
    if (pwd === 'ORANTE') {
      return NextResponse.next()
    }
  }

  // Si no hay contraseña o es incorrecta, muestra el candado
  return new NextResponse('Se requiere autenticación', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Zona Protegida"',
    },
  })
}

export const config = {
  // Este buscador le dice a Vercel que aplique la contraseña en TODO el sitio
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
