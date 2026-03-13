import { NextResponse } from 'next/server'

export async function GET() {
  const response = NextResponse.json({ message: "DEBUG: Forzando cookie insegura..." })
  
  // Quitamos Secure y HttpOnly para que sea visible y "fácil" de aceptar
  response.cookies.set('debug-auth', 'true', {
    path: '/',
    httpOnly: false, // LA QUEREMOS VER EN LA CONSOLA
    secure: false,   // LA QUEREMOS VER SIN HTTPS (SOLO PARA TEST)
    sameSite: 'lax',
    maxAge: 3600
    // NOTA: No pongas 'domain' todavía, deja que se guarde en accounts.streettaco...
  })

  return response
}