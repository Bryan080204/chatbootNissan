/* =====================================================================
   Nissan Chatbot - Migración NO destructiva
   Archivo: database/migration_citas.sql

   Crea la tabla dbo.Citas requerida por el módulo de Citas del panel
   administrativo. No elimina ni modifica tablas, columnas ni datos
   existentes. Es seguro ejecutarlo varias veces (usa IF OBJECT_ID).

   Reglas de negocio asumidas (documentadas):
     - Estados válidos: Pendiente, Confirmada, Cancelada,
       Completada, Reprogramada.
     - El catálogo de servicios no está normalizado: se guarda como texto.
     - Una cita puede (o no) estar ligada a una Conversación y a un Modelo.

   Ejecutar en el entorno de pruebas o en ChatbotNissanDB.

   Nota importante:
     El login de la aplicación (DB_USER = ChatbotNissanApp) NO tiene permiso
     para crear tablas (CREATE TABLE). Ejecuta este script con una cuenta con
     permisos de DDL, por ejemplo la autenticación de Windows:

       sqlcmd -S localhost -E -C -d ChatbotNissanDB -i database/migration_citas.sql

     o desde SQL Server Management Studio (SSMS) con un usuario administrador.

     Una vez creada la tabla, el login de la aplicación ya puede leer y
     escribir en dbo.Citas (mediante sus roles de base de datos).
   ===================================================================== */

SET NOCOUNT ON;
GO

IF OBJECT_ID('dbo.Citas', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Citas (
        CitaId              INT             IDENTITY(1,1) NOT NULL,
        ConversacionId      BIGINT          NULL,
        ModeloId            INT             NULL,
        UsuarioId           BIGINT          NULL,
        NombreCliente       NVARCHAR(150)   NOT NULL,
        TelefonoCliente     NVARCHAR(30)    NULL,
        CorreoCliente       NVARCHAR(254)   NULL,
        Servicio            NVARCHAR(100)   NOT NULL,
        FechaCita           DATETIME2       NOT NULL,
        Estado              NVARCHAR(30)    NOT NULL
                            CONSTRAINT DF_Citas_Estado DEFAULT ('Pendiente'),
        Notas               NVARCHAR(500)   NULL,
        FechaCreacion       DATETIME2       NOT NULL
                            CONSTRAINT DF_Citas_FechaCreacion DEFAULT (SYSDATETIME()),
        FechaActualizacion  DATETIME2       NULL,

        CONSTRAINT PK_Citas PRIMARY KEY CLUSTERED (CitaId),

        CONSTRAINT CK_Citas_Estado CHECK (
            Estado IN (
                'Pendiente',
                'Confirmada',
                'Cancelada',
                'Completada',
                'Reprogramada'
            )
        ),

        CONSTRAINT FK_Citas_Conversaciones FOREIGN KEY (ConversacionId)
            REFERENCES dbo.Conversaciones (ConversacionId),

        CONSTRAINT FK_Citas_Modelos FOREIGN KEY (ModeloId)
            REFERENCES dbo.Modelos (ModeloId),

        CONSTRAINT FK_Citas_Usuarios FOREIGN KEY (UsuarioId)
            REFERENCES dbo.Usuarios (UsuarioId)
    );

    CREATE INDEX IX_Citas_FechaCita ON dbo.Citas (FechaCita);
    CREATE INDEX IX_Citas_Estado ON dbo.Citas (Estado);

    PRINT 'Tabla dbo.Citas creada correctamente.';
END
ELSE
BEGIN
    PRINT 'La tabla dbo.Citas ya existe. No se realizaron cambios.';
END
GO
