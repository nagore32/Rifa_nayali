# Gran Rifa — código de la página

Esta carpeta es una página web normal (HTML, CSS, JS). No depende de Claude
para nada. La gente que la visite solo puede **ver** el tablero (qué números
están libres, apartados o pagados); tú marcas los pagos desde el panel de
la base de datos, en un minuto, sin programar.

```
index.html
css/style.css
js/config.js   <- aquí editas los datos de tu rifa
js/app.js      <- lógica de la página (no hace falta tocarlo)
images/        <- fotos de tus premios
```

Importante: una base de datos "local" (en tu computadora) no funciona aquí,
porque las personas que entren a tu página desde su celular no tienen forma
de llegar hasta tu computadora. Por eso usamos una base de datos gratis que
vive en internet: **Supabase**. No pide tarjeta para el plan gratis.

---

## Paso 1 — Crea tu base de datos gratis (Supabase)

1. Entra a **https://supabase.com** → **Start your project** → crea una
   cuenta (puedes usar tu cuenta de Google o GitHub).
2. Crea un proyecto nuevo (**New project**). Ponle un nombre, una
   contraseña (guárdala, no la necesitarás para esto pero es buena
   costumbre) y elige la región más cercana a ti (por ejemplo, São Paulo).
   Espera 1-2 minutos a que se cree.
3. En el menú de la izquierda entra a **SQL Editor** → **New query**, pega
   este bloque completo y dale a **Run**:

   ```sql
   -- La tabla completa: número, estado, y los datos del comprador
   create table numbers (
     number int primary key,
     status text not null default 'free' check (status in ('free','reserved','paid')),
     buyer_name text,
     buyer_phone text,
     note text,
     updated_at timestamptz not null default now()
   );

   insert into numbers (number)
   select generate_series(1, 300);

   alter table numbers enable row level security;

   -- Una "ventana" pública que solo deja ver el número y el estado.
   -- El nombre y el teléfono del comprador NUNCA salen de aquí.
   create view public_numbers as
     select number, status from numbers;

   grant select on public_numbers to anon;

   -- Solo alguien con tu usuario (ver Paso 2) puede leer o editar
   -- la tabla completa, con nombre y teléfono incluidos.
   create policy "Solo el organizador ve todo"
   on numbers for select
   using (auth.role() = 'authenticated');

   create policy "Solo el organizador edita"
   on numbers for update
   using (auth.role() = 'authenticated')
   with check (auth.role() = 'authenticated');
   ```

   Esto crea tus 300 números (todos "free" = libres). Los visitantes de tu
   página leen la "ventana" `public_numbers`, que solo trae el número y si
   está libre, apartado o pagado. El nombre y teléfono de cada comprador
   quedan en la tabla `numbers`, que solo se puede leer o editar con tu
   usuario (siguiente paso).

   Si más adelante cambias la cantidad de números en `config.js`, corre de
   nuevo un `insert` como el de arriba ajustando el rango, por ejemplo
   `generate_series(301, 400)` para agregar del 301 al 400.

4. En el menú de la izquierda entra a **Settings** (el engranaje) →
   **API**. Ahí vas a ver dos datos que necesitas:
   - **Project URL** (algo como `https://abcdefgh.supabase.co`)
   - **anon public** key (una clave larga, empieza distinto a la
     `service_role`, que **no** es la que usas aquí)

## Paso 2 — Crea tu usuario de organizador (el "admin")

Esto es lo que hace que el panel sea **solo para ti**: un usuario y
contraseña de verdad, del sistema de cuentas de Supabase (no un truco
escrito en el código, que cualquiera podría leer).

1. En Supabase, ve a **Authentication** → **Users** → **Add user** →
   **Create new user**.
2. Pon tu correo y una contraseña. Marca la casilla **Auto Confirm User**
   (así no hace falta que confirmes el correo).
3. Dale a **Create user**. Listo, ese es el único usuario que puede entrar
   al panel. Puedes crear más adelante otro para alguien de confianza, de
   la misma forma.

Guarda ese correo y esa contraseña en un lugar seguro: son la llave de tu
panel. Si la olvidas, puedes cambiarla desde el mismo lugar
(**Authentication** → **Users** → los tres puntos junto al usuario →
**Send password recovery**, o simplemente bórralo y crea uno nuevo).

## Paso 3 — Conecta la página a tu base de datos

Abre `js/config.js` en cualquier editor de texto (o el Bloc de notas) y
pega ahí lo que copiaste:

```js
supabaseUrl: "https://abcdefgh.supabase.co",
supabaseAnonKey: "eyJhbGciOiJI...",
```

Aprovecha y completa el resto del archivo con los datos reales de tu rifa:
precio, WhatsApp, datos de pago, premios, etc. Cada línea tiene un
comentario que explica qué es.

## Paso 4 — Sube la página a Netlify (gratis)

**Opción rápida, sin cuenta de GitHub:**

1. Entra a **https://app.netlify.com/drop**
2. Arrastra la carpeta completa `rifaweb` (o el .zip que te compartí, ambos
   funcionan) a esa página.
3. En unos segundos te da un enlace tipo `https://nombre-al-azar.netlify.app`.
   Esa ya es tu página, en internet, gratis.
4. Si quieres un nombre más bonito: entra al sitio en tu panel de Netlify →
   **Site configuration** → **Change site name**.

**Opción con actualizaciones automáticas (recomendada si vas a seguir
editando):**

1. Sube esta carpeta a un repositorio de GitHub (puedes arrastrar los
   archivos directamente en github.com, sin usar la terminal).
2. En Netlify: **Add new site** → **Import an existing project** → elige
   ese repositorio.
3. Déjalo todo por defecto (no hay que compilar nada) y dale **Deploy**.
   Desde ahora, cada vez que cambies algo en GitHub, Netlify actualiza tu
   página sola.

## Paso 5 — Marca los números pagados, desde tu propio panel

Tu página trae un panel privado en `/admin.html` — por ejemplo,
`https://tu-rifa.netlify.app/admin.html`. Esa dirección no aparece
enlazada en ningún botón de la página pública; solo tú (o quien tenga el
link) sabe que existe, y además pide el usuario y contraseña del Paso 2.

1. Entra a esa dirección.
2. Escribe el correo y la contraseña que creaste en el Paso 2.
3. Ahí ves cuánto llevas recaudado, puedes buscar un número, y al tocarlo
   se abre un formulario para poner el estado (libre, apartado, pagado),
   el nombre, el teléfono y una nota.
4. Dale **Guardar**. Se actualiza al toque, tanto en tu panel como en la
   página pública (que se refresca sola cada 25 segundos).
5. **Cerrar sesión** cierra el panel; la próxima vez vuelves a pedir tu
   correo y contraseña.

Como alternativa, sigues pudiendo entrar a **Table Editor** en Supabase y
editar la tabla `numbers` directamente ahí, como antes. Las dos formas
escriben en el mismo lugar.

## Agregar más premios (con su foto)

No hay límite de premios. Ya dejé un puesto 7 listo como ejemplo en
`js/config.js`:

1. Guarda tu foto dentro de la carpeta `images` (jpg o png, ojalá menos de
   500 KB para que la página cargue rápido). Ponle un nombre simple, sin
   espacios ni tildes, por ejemplo `premio7.jpg`.
2. Abre `js/config.js` y en la línea del premio 7 reemplaza
   `"images/TU-FOTO-AQUI.jpg"` por el nombre real de tu archivo, y escribe
   el nombre del premio donde dice "Escribe aquí el nombre de tu premio 7".
3. Para agregar un premio 8, 9, etc., copia esa misma línea y pégala antes
   del `]` que cierra la lista, cambiando el nombre y la foto.

Si subes la página sin reemplazar esa foto de ejemplo, no se rompe nada:
el casillero muestra un aviso de "Agrega tu foto en images/" hasta que la
pongas.

## Preguntas frecuentes

**¿La gente puede marcar números como pagados desde la página?**
No. La página pública (`index.html`) solo puede leer, nunca escribir: eso
lo dicen las reglas del Paso 1. Marcar como pagado lo haces tú, desde
`admin.html` o desde el Table Editor de Supabase, con tu usuario.

**¿Alguien más puede entrar a `admin.html`?** Solo si tiene el correo y
la contraseña exactos que creaste en el Paso 2. Aunque alguien encuentre
la dirección `/admin.html` o mire el código de la página, sin esas dos
cosas no puede entrar ni leer los datos de tus compradores: la revisión la
hace el propio Supabase, no algo escrito en el JavaScript.

**¿Y si quiero que otra persona de confianza también pueda entrar?**
Créale su propio usuario igual que en el Paso 2, con su correo. Evita
compartir tu misma contraseña.

**¿Cuesta algo?** Netlify y Supabase tienen planes gratis de sobra para
una rifa. Si el proyecto de Supabase pasa muchos días sin ninguna visita
puede "pausarse" solo; entra al panel y reactívalo con un clic si eso
pasa.

**¿Es seguro publicar la `anon key` en el código?** Sí. Esa clave por sí
sola solo deja leer `public_numbers` (número y estado, nada de
compradores). Para leer o escribir la tabla completa hace falta además tu
usuario y contraseña reales. La única clave que jamás debes compartir es
la `service_role`, y no la necesitas para nada de esto.

**Ya tenía la base de datos armada con la guía anterior (sin login), ¿qué
cambia?** Antes, la clave pública dejaba leer también los nombres y
teléfonos si alguien sabía buscarlos a mano; ahora quedan detrás de tu
usuario. Si ya habías creado la tabla `numbers` con la política vieja
("Cualquiera puede ver los números"), corre esto una vez en el SQL
Editor para actualizarla, y después el bloque completo del Paso 1 desde
`create view public_numbers` hacia abajo:

```sql
drop policy if exists "Cualquiera puede ver los números" on numbers;
```
