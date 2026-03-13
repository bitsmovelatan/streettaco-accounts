import { NextResponse } from 'next/server'

export async function GET() {
  const response = NextResponse.json({ message: "DEBUG: Test 001 Forzando cookie insegura..." })
  
  // Quitamos Secure y HttpOnly para que sea visible y "fácil" de aceptar
  response.cookies.set('debug-auth', 'true', {
    path: '/',
    httpOnly: false,
    secure: true, 
    sameSite: 'none', // Cambia 'lax' por 'none' (requiere secure: true)
    domain: 'streettaco.com.au', // PRUEBA SIN EL PUNTO INICIAL
    maxAge: 3600
})

  return response
}