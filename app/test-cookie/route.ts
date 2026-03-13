import { NextResponse } from 'next/server'

export async function GET() {
  const response = NextResponse.json({ message: "Forzando cookie de prueba..." })
  
  // Forzamos una cookie manual sin Supabase de por medio
  response.cookies.set('test-streettaco', 'funciona', {
    domain: '.streettaco.com.au', // EL PUNTO ES VITAL
    path: '/',
    httpOnly: false, // La ponemos false para verla en la consola
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 // 1 hora
  })

  return response
}