# Definición de Personas y Mapa de Empatía - GameWeb

## Ficha de Persona 1: El Cliente / Jugador
* **Nombre y edad:** Carlos Mendoza, 22 años.
* **Ocupación y contexto:** Universitario y aficionado a los videojuegos; utiliza su computadora por las tardes para estudiar y buscar entretenimiento.
* **Tecnología:** Computadora con Windows, smartphone Android, uso diario de navegadores web y plataformas digitales.
* **Motivación:** Encontrar una plataforma web rápida y organizada para explorar catálogos de juegos sin perder tiempo.
* **Objetivos:** Navegar por los contenidos de los juegos de forma fluida y acceder a su cuenta de manera segura.
* **Frustraciones:** Páginas lentas, interfaces confusas y formularios de inicio de sesión demasiado largos o con contraseñas difíciles de recordar.
* **Escenario de uso:** Desde su laptop en casa, por las noches, en sesiones de 30 a 45 minutos.
* **Tipo de usuario:** Cliente.
* **Frase que lo define:** *"Solo quiero entrar rápido a ver los juegos sin complicarme la vida"*.

---

## Ficha de Persona 2: El Administrador del Sistema
* **Nombre y edad:** Leo Steep Pacho Lopez, 21 años.
* **Ocupación y contexto:** Administradora de contenidos digitales encargada de actualizar y supervisar la plataforma web.
* **Tecnología:** Laptop de alta gama, herramientas de gestión de bases de datos y paneles de control web.
* **Motivación:** Mantener el catálogo y la información de la plataforma actualizada y bajo control de manera eficiente.
* **Objetivos:** Gestionar los registros, catálogos y usuarios de forma estructurada y sin errores en producción.
* **Frustraciones:** Caídas en los servidores de despliegue, falta de sincronización en los datos y procesos manuales lentos.
* **Escenario de uso:** Durante horario laboral desde su estación de trabajo para control continuo del sistema.
* **Tipo de usuario:** Administrador.
* **Frase que la define:** *"La plataforma debe ser estable, segura y fácil de administrar"*.

---

## Mapa de Empatía (Basado en Persona 1 - Carlos)

### Piensa y siente
* Siente que muchas páginas web actuales son demasiado lentas o complicadas.
* Piensa que el acceso a las plataformas debería ser inmediato mediante cuentas integradas.

### Ve
* Ve interfaces de catálogos aburridas o desordenadas en otros sitios web.
* Ve que sus amigos prefieren aplicaciones web minimalistas y responsivas.

### Oye
* Oye recomendaciones de sus compañeros sobre nuevos títulos de videojuegos.
* Oye quejas frecuentes sobre errores de carga en sitios web mal optimizados.

### Dice y hace
* Dice que prefiere iniciar sesión con un solo clic (ej. Google) para ahorrar tiempo.
* Navega activamente buscando categorías claras y bien estructuradas.

### Dolores (Frustraciones)
* Olvidar contraseñas tradicionales y lidiar con procesos de recuperación largos.
* Encontrarse con páginas que fallan al adaptarse a dispositivos móviles o portátiles.

### Ganancias (Éxitos)
* Acceder a la plataforma de forma instantánea y encontrar catálogos ordenados por categorías en segundos.

---

## Historias de Usuario (Basadas en los Dolores del Mapa de Empatía)

### Historia 1: Autenticación rápida
* **Dolor:** Olvidar contraseñas tradicionales y lidiar con procesos de recuperación largos.
* **Historia:** Como Carlos, quiero iniciar sesión utilizando mi cuenta de Google para no tener que recordar otra contraseña ni pasar por formularios largos.
* **Criterio:** Dado que Carlos se encuentra en la pantalla de inicio de sesión, cuando hace clic en "Entrar con Google", entonces el sistema autentica sus credenciales de forma automática y lo redirige al panel principal en menos de 2 segundos.

### Historia 2: Filtrado eficiente de contenidos
* **Dolor:** Encontrarse con páginas web desordenadas donde es difícil encontrar información específica rápidamente.
* **Historia:** Como Carlos, quiero filtrar el catálogo de videojuegos por categorías y géneros para encontrar títulos de mi interés de forma inmediata.
* **Criterio:** Dado que Carlos selecciona un filtro en el menú de categorías, entonces la interfaz actualiza los resultados en tiempo real mostrando únicamente los juegos correspondientes a esa selección.

### Historia 3: Visualización de información en dispositivos móviles
* **Dolor:** Páginas web que fallan al adaptarse correctamente a dispositivos portátiles o móviles.
* **Historia:** Como Carlos, quiero que la interfaz de la plataforma se adapte automáticamente al tamaño de la pantalla de mi dispositivo para navegar con comodidad desde cualquier lugar.
* **Criterio:** Dado que Carlos accede a la aplicación web desde un dispositivo móvil o laptop, entonces el diseño responsivo redistribuye los elementos visuales sin alterar la legibilidad ni recortar contenido.