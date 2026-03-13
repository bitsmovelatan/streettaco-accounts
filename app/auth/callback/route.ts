import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { isProduction } from "@/lib/constants"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const return_to = searchParams.get("return_to") || "https://plus.streettaco.com.au"

  if (code) {
    console.log("Intentando setear cookies para el dominio .streettaco.com.au")
    const supabase = await createClient()
    // 1. Intercambiamos el código por la sesión AQUÍ
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 2. Si todo salió bien, la cookie YA SE ESCRIBIÓ en .streettaco.com.au
      // Redirigimos a PLUS, pero LIMPIAMOS el parámetro code para evitar el loop
      const response = NextResponse.redirect(return_to)
      return response
    }
  }

  // Si hay error, regresamos al login de accounts con error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}