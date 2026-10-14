/* =====================================================================
   Nissan Chatbot - Datos de PRUEBA (ficticios)
   Archivo: database/seed_pruebas.sql

   IMPORTANTE:
     - Este script NO se ejecuta automáticamente.
     - Inserta datos FICTICIOS claramente identificables para poder
       probar el panel (gráficas, conversaciones, citas, seguridad).
     - No modifica ni elimina al administrador actual ni ningún registro
       existente. Todas las inserciones están protegidas con IF NOT EXISTS.
     - No inserta contraseñas reales.
     - Ejecutarlo SOLO en un entorno de pruebas o cuando se desee poblar
       datos de demostración.

   Requisitos:
     - Haber ejecutado antes: database/migration_citas.sql (tabla Citas).
     - Los clientes de prueba usan teléfonos 55000000xx y nombres
       "Cliente Prueba N" para poder identificarlos y borrarlos después.

   Ejecutar:
     sqlcmd -S localhost -d ChatbotNissanDB -i database/seed_pruebas.sql

   Para eliminar los datos de prueba:
     DELETE FROM dbo.Mensajes WHERE ConversacionId IN
       (SELECT ConversacionId FROM dbo.Conversaciones WHERE TelefonoCliente LIKE '55000000%');
     DELETE FROM dbo.Citas  WHERE TelefonoCliente LIKE '55000000%';
     DELETE FROM dbo.Conversaciones WHERE TelefonoCliente LIKE '55000000%';
     DELETE FROM dbo.Vehiculos WHERE VIN LIKE 'TEST%';
     DELETE FROM dbo.IntentosAcceso WHERE CorreoIntentado LIKE '%@prueba.local';
     DELETE FROM dbo.Auditoria WHERE Detalle LIKE '[PRUEBA]%';
   ===================================================================== */

SET NOCOUNT ON;

DECLARE @convId BIGINT;

/* ------------------------------------------------------------------
   1) CONVERSACIONES de prueba (últimos 7 días)
   ------------------------------------------------------------------ */
IF NOT EXISTS (SELECT 1 FROM dbo.Conversaciones WHERE TelefonoCliente = '5500000001')
BEGIN
    INSERT INTO dbo.Conversaciones
        (UsuarioId, NombreCliente, CorreoCliente, TelefonoCliente, Canal, Estado, FechaInicio)
    VALUES
        (NULL, 'Cliente Prueba Uno',  'prueba1@prueba.local', '5500000001', 'WhatsApp', 'Activa', DATEADD(day, -6, SYSDATETIME())),
        (NULL, 'Cliente Prueba Dos',  'prueba2@prueba.local', '5500000002', 'WhatsApp', 'Activa', DATEADD(day, -5, SYSDATETIME())),
        (NULL, 'Cliente Prueba Tres', 'prueba3@prueba.local', '5500000003', 'WhatsApp', 'Activa', DATEADD(day, -3, SYSDATETIME())),
        (NULL, 'Cliente Prueba Cuatro','prueba4@prueba.local','5500000004', 'WhatsApp', 'Cerrada', DATEADD(day, -1, SYSDATETIME()));
END

/* ------------------------------------------------------------------
   2) MENSAJES de prueba
   ------------------------------------------------------------------ */
IF NOT EXISTS (
    SELECT 1 FROM dbo.Mensajes m
    INNER JOIN dbo.Conversaciones c ON c.ConversacionId = m.ConversacionId
    WHERE c.TelefonoCliente LIKE '55000000%'
)
BEGIN
    -- Conversación 5500000001
    SELECT @convId = ConversacionId FROM dbo.Conversaciones WHERE TelefonoCliente = '5500000001';
    IF @convId IS NOT NULL
    BEGIN
        INSERT INTO dbo.Mensajes (ConversacionId, Emisor, Contenido, FechaMensaje, IntencionDetectada, FueExitoso)
        VALUES
            (@convId, 'usuario',   'Hola, me interesa el Nissan Versa', DATEADD(hour, -30, SYSDATETIME()), NULL, NULL),
            (@convId, 'asistente', '¡Hola! Con gusto te ayudo con el Versa. ¿Buscas precio de contado o financiamiento?', DATEADD(hour, -30, SYSDATETIME()), 'cotizacion', 1),
            (@convId, 'usuario',   'Precio de contado', DATEADD(hour, -29, SYSDATETIME()), NULL, NULL),
            (@convId, 'asistente', 'Para darte un precio correcto necesito confirmar la versión vigente.', DATEADD(hour, -29, SYSDATETIME()), 'cotizacion', 1);
    END

    -- Conversación 5500000002
    SELECT @convId = ConversacionId FROM dbo.Conversaciones WHERE TelefonoCliente = '5500000002';
    IF @convId IS NOT NULL
    BEGIN
        INSERT INTO dbo.Mensajes (ConversacionId, Emisor, Contenido, FechaMensaje, IntencionDetectada, FueExitoso)
        VALUES
            (@convId, 'usuario',   'Buenas tardes', DATEADD(day, -5, SYSDATETIME()), NULL, NULL),
            (@convId, 'asistente', '¡Hola! Soy el asistente virtual de Nissan México. ¿Qué modelo te interesa?', DATEADD(day, -5, SYSDATETIME()), 'saludo', 1),
            (@convId, 'usuario',   'Quiero una camioneta para viajar con mi familia', DATEADD(day, -4, SYSDATETIME()), NULL, NULL),
            (@convId, 'asistente', 'El Nissan X-Trail o Kicks pueden funcionar bien. ¿Cuántas personas viajan contigo?', DATEADD(day, -4, SYSDATETIME()), 'vehiculos', 1);
    END

    -- Conversación 5500000003
    SELECT @convId = ConversacionId FROM dbo.Conversaciones WHERE TelefonoCliente = '5500000003';
    IF @convId IS NOT NULL
    BEGIN
        INSERT INTO dbo.Mensajes (ConversacionId, Emisor, Contenido, FechaMensaje, IntencionDetectada, FueExitoso)
        VALUES
            (@convId, 'usuario',   '¿Dónde están ubicados?', DATEADD(day, -3, SYSDATETIME()), NULL, NULL),
            (@convId, 'asistente', 'La dirección registrada es Avenida Universidad 733, Oaxaca. 📍', DATEADD(day, -3, SYSDATETIME()), 'ubicacion', 1),
            (@convId, 'usuario',   'Gracias', DATEADD(day, -2, SYSDATETIME()), NULL, NULL),
            (@convId, 'asistente', 'Con gusto. ¿Deseas agendar una prueba de manejo?', DATEADD(day, -2, SYSDATETIME()), 'seguimiento', 1);
    END
END

/* ------------------------------------------------------------------
   3) CITAS de prueba (requiere haber ejecutado migration_citas.sql)
   ------------------------------------------------------------------ */
IF OBJECT_ID('dbo.Citas', 'U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM dbo.Citas WHERE TelefonoCliente LIKE '55000000%')
BEGIN
    INSERT INTO dbo.Citas
        (ConversacionId, ModeloId, UsuarioId, NombreCliente, TelefonoCliente, CorreoCliente, Servicio, FechaCita, Estado, Notas)
    VALUES
        (NULL, 1, NULL, 'Cliente Prueba Uno',   '5500000001', 'prueba1@prueba.local', 'Prueba de manejo',   DATEADD(day,  1, SYSDATETIME()), 'Pendiente',   '[PRUEBA] Cita de demostración.'),
        (NULL, 2, NULL, 'Cliente Prueba Dos',   '5500000002', 'prueba2@prueba.local', 'Cotización',         DATEADD(day,  2, SYSDATETIME()), 'Confirmada',  '[PRUEBA] Cita de demostración.'),
        (NULL, 3, NULL, 'Cliente Prueba Tres',  '5500000003', 'prueba3@prueba.local', 'Mantenimiento',      DATEADD(day, -1, SYSDATETIME()), 'Completada',  '[PRUEBA] Cita de demostración.'),
        (NULL, NULL, NULL, 'Cliente Prueba Cuatro','5500000004','prueba4@prueba.local','Asesoría comercial', DATEADD(day, -3, SYSDATETIME()), 'Cancelada',   '[PRUEBA] Cita de demostración.');
END

/* ------------------------------------------------------------------
   4) VEHÍCULOS de prueba (VIN con prefijo TEST)
   ------------------------------------------------------------------ */
IF NOT EXISTS (SELECT 1 FROM dbo.Vehiculos WHERE VIN LIKE 'TEST%')
BEGIN
    INSERT INTO dbo.Vehiculos (ModeloId, Anio, Version, Color, Precio, Existencia, VIN, Estado, Activo)
    VALUES
        (1, 2026, 'Advance', 'Azul',  345000.00, 2, 'TESTVERSA000000001', 'Disponible',    1),
        (2, 2026, 'Exclusive','Negro', 465000.00, 1, 'TESTSENTRA00000001', 'Apartado',      1),
        (3, 2025, 'Platinum', 'Plata', 510000.00, 3, 'TESTKICKS000000001', 'Disponible',    1),
        (1, 2024, 'Sense',    'Gris',  295000.00, 0, 'TESTVERSA000000002', 'Vendido',       1),
        (2, 2023, 'Advance',  'Blanco',380000.00, 1, 'TESTSENTRA00000002', 'Mantenimiento', 0);
END

/* ------------------------------------------------------------------
   5) INTENTOS DE ACCESO de prueba
   ------------------------------------------------------------------ */
IF NOT EXISTS (SELECT 1 FROM dbo.IntentosAcceso WHERE CorreoIntentado LIKE '%@prueba.local')
BEGIN
    INSERT INTO dbo.IntentosAcceso (UsuarioId, CorreoIntentado, Exitoso, Motivo, DireccionIP, FechaIntento)
    VALUES
        (NULL, 'usuario1@prueba.local', 1, 'Inicio de sesión correcto', '192.168.1.10', DATEADD(hour, -20, SYSDATETIME())),
        (NULL, 'usuario1@prueba.local', 0, 'Credenciales incorrectas',  '192.168.1.10', DATEADD(hour, -21, SYSDATETIME())),
        (NULL, 'usuario2@prueba.local', 1, 'Inicio de sesión correcto', '192.168.1.20', DATEADD(hour, -8,  SYSDATETIME())),
        (NULL, 'usuario3@prueba.local', 0, 'Credenciales incorrectas',  '10.0.0.5',     DATEADD(hour, -2,  SYSDATETIME())),
        (NULL, 'usuario2@prueba.local', 1, 'Cierre de sesión',          '192.168.1.20', DATEADD(hour, -1,  SYSDATETIME()));
END

/* ------------------------------------------------------------------
   6) AUDITORÍA de prueba
   ------------------------------------------------------------------ */
IF NOT EXISTS (SELECT 1 FROM dbo.Auditoria WHERE Detalle LIKE '[PRUEBA]%')
BEGIN
    INSERT INTO dbo.Auditoria (UsuarioId, Accion, TablaAfectada, RegistroId, Detalle, DireccionIP, FechaAccion)
    VALUES
        (1, 'CREAR_VEHICULO',   'Vehiculos', '0',   '[PRUEBA] Alta de vehículo de demostración.', '192.168.1.10', DATEADD(day, -2, SYSDATETIME())),
        (1, 'EDITAR_VEHICULO',  'Vehiculos', '0',   '[PRUEBA] Edición de vehículo de demostración.', '192.168.1.10', DATEADD(day, -1, SYSDATETIME())),
        (1, 'CREAR_CITA',       'Citas',     '0',   '[PRUEBA] Cita de demostración.', '192.168.1.10', DATEADD(hour, -5, SYSDATETIME()));
END

PRINT 'Datos de prueba insertados (si no existían).';
GO
