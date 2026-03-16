# Validación: "Redirect desde quien lo llama" vs flujo Waiting → Plus

## Qué se implementó en "redirect desde quien lo llama"

1. **`app/page.tsx` (home)**  
   - Antes: se usaba `return_to` tal cual para login, consent y redirect final.  
   - Ahora: se usa `parseReturnTo(return_to)` y solo se usa `safeReturnTo` si es válido; si no, se usa `DEFAULT_RETURN_URL`.  
   - **Afecta al waiting:** No. La waiting page no se construye desde home. El usuario llega a waiting desde el login (tras pedir magic link). El `return_to` de la waiting viene de la URL que construye `magic-link.ts` (ver abajo).

2. **`app/consent/page.tsx`**  
   - Antes: se usaba `params.return_to` directo.  
   - Ahora: `safeReturnTo = parseReturnTo(params.return_to)` y solo se usa si `ok`.  
   - **Afecta al waiting:** No. Consent es post-login; el flujo magic link es login → waiting (sin pasar por consent en ese camino).

3. **`lib/supabase/middleware.ts`**  
   - Antes: si usuario autenticado en `/login` → redirect a return_to o profile.  
   - Ahora: si pathname === `/login` → no redirect (se deja ver la Active Session card).  
   - Para rutas protegidas sin usuario: antes se pasaba `return_to` o `request.url` al login; ahora solo se añade `return_to` si `parseReturnTo(rawReturnTo).ok`.  
   - **Afecta al waiting:** No. El waiting page no pasa por este redirect. Cuando Plus manda a `accounts/login?return_to=...`, ese `return_to` sigue siendo válido (Plus está en *.streettaco.com.au), así que se sigue pasando bien al login y de ahí al magic link.

4. **`app/actions/magic-link.ts`**  
   - No se tocó en "redirect desde quien lo llama". Sigue usando `safeReturnTo` (ya validado con `parseReturnTo` en `requestMagicLink`) para construir `callbackUrl` y **waitingPath**.  
   - `waitingPath` sigue llevando `return_to` en la query cuando hay `safeReturnTo`.

5. **`app/auth/waiting/page.tsx`**  
   - No se modificó en "redirect desde quien lo llama".  
   - Después, en otro cambio, se pasó a usar **POST a `/api/auth/apply-and-redirect`** en lugar de `setSession` en cliente + `window.location.href`, para que la cookie se ponga en el servidor con `domain: .streettaco.com.au` y Plus reciba sesión.

## Conclusión

- **Nada de lo que se hizo en "redirect desde quien lo llama"** (validar `return_to` en home/consent/middleware, no redirigir desde `/login` cuando hay sesión) **toca el flujo waiting → Plus**.
- El flujo que sí cambió fue el **cómo** se aplica la sesión y se redirige a Plus: ahora es **apply-and-redirect** (form POST al servidor, cookie con dominio compartido, 302 a Plus). Eso se hizo para corregir “llego a Plus sin sesión”, no como parte del “redirect desde quien lo llama”.

## Si antes funcionaba y ahora no

- **Antes:** `setSession` en cliente en la waiting page + `setTimeout(..., 1800)` + `window.location.href = return_to`. La cookie en cliente a veces no se escribía con `domain: .streettaco.com.au`, por eso Plus podía no ver sesión.
- **Ahora:** POST a `/api/auth/apply-and-redirect` con `token` y `return_to`; el servidor hace `setSession`, escribe la cookie en la respuesta con dominio compartido y redirige a Plus.

Si quieres **volver al comportamiento anterior** (solo cliente), en `app/auth/waiting/page.tsx` se podría revertir a usar `setSession` + `redirectToReturn` después de un delay (y quitar el form POST a apply-and-redirect), asumiendo que en tu entorno la cookie en cliente sí se comparte; en muchos entornos el servidor (apply-and-redirect) es más fiable.

## Resumen

| Cambio "redirect desde quien lo llama" | ¿Afecta waiting → Plus? |
|----------------------------------------|---------------------------|
| Home: solo usar return_to si parseReturnTo ok | No |
| Consent: solo usar return_to si parseReturnTo ok | No |
| Middleware: no redirigir desde /login si hay sesión | No |
| Middleware: solo poner return_to en login si parseReturnTo ok | No (Plus sigue siendo URL válida) |
| Magic-link: sin cambios en esa tarea | - |
| Waiting: sin cambios en esa tarea (luego se añadió apply-and-redirect) | El flujo de “a dónde” va (return_to) sigue igual; lo que cambió fue “cómo” se setea la cookie (servidor vs cliente). |
