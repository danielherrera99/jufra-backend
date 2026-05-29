-- DDL de base de datos para Jufra-Pomalca en Supabase (PostgreSQL)

-- Deshabilitar triggers temporalmente si existen
SET session_replication_role = 'replica';

-- 1. Eliminar tablas existentes si ya existen para permitir re-ejecución limpia
DROP TABLE IF EXISTS ofs_config CASCADE;
DROP TABLE IF EXISTS web_config CASCADE;
DROP TABLE IF EXISTS fraternidades CASCADE;
DROP TABLE IF EXISTS solicitudes CASCADE;
DROP TABLE IF EXISTS servicio_participantes CASCADE;
DROP TABLE IF EXISTS servicios CASCADE;
DROP TABLE IF EXISTS peticion_oraciones CASCADE;
DROP TABLE IF EXISTS peticiones CASCADE;
DROP TABLE IF EXISTS mensajes CASCADE;
DROP TABLE IF EXISTS formaciones CASCADE;
DROP TABLE IF EXISTS galeria CASCADE;
DROP TABLE IF EXISTS eventos CASCADE;
DROP TABLE IF EXISTS documentos CASCADE;
DROP TABLE IF EXISTS cantos CASCADE;
DROP TABLE IF EXISTS acuerdos CASCADE;
DROP TABLE IF EXISTS acta_asistentes CASCADE;
DROP TABLE IF EXISTS actas CASCADE;
DROP TABLE IF EXISTS asistencias CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- Restaurar triggers
SET session_replication_role = 'origin';

-- 2. Creación de Tabla: usuarios
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    contacto_emergencia VARCHAR(20),
    nombre_contacto_emergencia VARCHAR(100),
    fecha_nacimiento DATE,
    fecha_ingreso DATE DEFAULT CURRENT_DATE,
    fecha_promesa DATE,
    rol VARCHAR(20) NOT NULL DEFAULT 'miembro',
    cargo VARCHAR(30) NOT NULL DEFAULT 'ninguno',
    foto_url TEXT,
    activo BOOLEAN NOT NULL DEFAULT FALSE,
    codigo_qr TEXT,
    expo_push_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_rol CHECK (rol IN ('admin', 'consejo', 'miembro')),
    CONSTRAINT check_cargo CHECK (cargo IN ('coordinador', 'vice-coordinador', 'secretario', 'tesorero', 'formador', 'animador', 'ninguno'))
);

-- Crear índices para búsquedas por usuario
CREATE INDEX idx_usuarios_username ON usuarios(username);
CREATE INDEX idx_usuarios_activo ON usuarios(activo);

-- 3. Creación de Tabla: asistencias
CREATE TABLE asistencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre_invitado VARCHAR(100),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    tipo_reunion VARCHAR(30) NOT NULL DEFAULT 'semanal',
    presente BOOLEAN NOT NULL DEFAULT TRUE,
    estado VARCHAR(20) NOT NULL DEFAULT 'presente',
    metodo_registro VARCHAR(20) NOT NULL DEFAULT 'manual',
    observaciones TEXT,
    registrado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_tipo CHECK (tipo_reunion IN ('semanal', 'consejo', 'formacion', 'apostolado', 'especial')),
    CONSTRAINT check_estado CHECK (estado IN ('presente', 'ausente', 'justificado', 'falta', 'permiso', 'tardanza')),
    CONSTRAINT check_metodo CHECK (metodo_registro IN ('qr', 'manual', 'automatico', 'manual_web', 'manual_app')),
    CONSTRAINT unica_asistencia_diaria UNIQUE (usuario_id, fecha, tipo_reunion)
);

CREATE INDEX idx_asistencias_fecha ON asistencias(fecha);
CREATE INDEX idx_asistencias_usuario ON asistencias(usuario_id);

-- 4. Creación de Tabla: actas
CREATE TABLE actas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    tipo_reunion VARCHAR(30) NOT NULL DEFAULT 'consejo',
    contenido TEXT NOT NULL,
    archivo_pdf_url TEXT,
    creado_por UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_tipo_reunion CHECK (tipo_reunion IN ('consejo', 'fraternidad', 'formacion', 'extraordinaria'))
);

-- Tabla intermedia: acta_asistentes
CREATE TABLE acta_asistentes (
    acta_id UUID REFERENCES actas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    PRIMARY KEY (acta_id, usuario_id)
);

-- 5. Creación de Tabla: acuerdos
CREATE TABLE acuerdos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    acta_id UUID REFERENCES actas(id) ON DELETE CASCADE,
    descripcion TEXT NOT NULL,
    responsable_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha_limite DATE,
    completado BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Creación de Tabla: cantos
CREATE TABLE cantos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    letra TEXT NOT NULL,
    categoria VARCHAR(30) NOT NULL DEFAULT 'otro',
    autor VARCHAR(100),
    creado_por UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
    archivo_url TEXT,
    archivo_nombre VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_categoria_canto CHECK (categoria IN ('entrada', 'ofertorio', 'comunion', 'salida', 'franciscano', 'mariano', 'adoracion', 'animacion', 'otro'))
);

-- 7. Creación de Tabla: documentos
CREATE TABLE documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(30) NOT NULL DEFAULT 'otro',
    contenido TEXT,
    archivo_url TEXT,
    archivo_nombre VARCHAR(255),
    creado_por UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_tipo_documento CHECK (tipo IN ('regla', 'ccgg', 'estatuto', 'formacion', 'otro'))
);

-- 8. Creación de Tabla: eventos
CREATE TABLE eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    fecha DATE NOT NULL,
    hora VARCHAR(10),
    lugar VARCHAR(255) DEFAULT 'Parroquia',
    latitud NUMERIC(10, 8),
    longitud NUMERIC(11, 8),
    tipo VARCHAR(30) NOT NULL DEFAULT 'otro',
    creado_por UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
    imagen_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_tipo_evento CHECK (tipo IN ('reunion', 'misa', 'formacion', 'retiro', 'fraternidad', 'otro'))
);

-- 9. Creación de Tabla: galeria
CREATE TABLE galeria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    fecha DATE DEFAULT CURRENT_DATE,
    archivo_url TEXT NOT NULL,
    tipo_archivo VARCHAR(20) NOT NULL DEFAULT 'imagen',
    categoria VARCHAR(50) DEFAULT 'general',
    subido_por UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_tipo_archivo CHECK (tipo_archivo IN ('imagen', 'video'))
);

-- 10. Creación de Tabla: formaciones
CREATE TABLE formaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    contenido TEXT NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    autor UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
    archivo_url TEXT,
    archivo_nombre VARCHAR(255),
    etiquetas TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Creación de Tabla: mensajes
CREATE TABLE mensajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    remitente_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    destinatario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    contenido TEXT NOT NULL,
    leido BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Creación de Tabla: peticiones
CREATE TABLE peticiones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contenido TEXT NOT NULL,
    autor_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    anonimo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla intermedia: peticion_oraciones
CREATE TABLE peticion_oraciones (
    peticion_id UUID REFERENCES peticiones(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (peticion_id, usuario_id)
);

-- 13. Creación de Tabla: servicios
CREATE TABLE servicios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL,
    fecha DATE NOT NULL,
    lugar VARCHAR(255) NOT NULL,
    cupo_maximo INT DEFAULT 0,
    imagen_url TEXT,
    latitud NUMERIC(10, 8),
    longitud NUMERIC(11, 8),
    creado_por UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla intermedia: servicio_participantes
CREATE TABLE servicio_participantes (
    servicio_id UUID REFERENCES servicios(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    inscrito_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (servicio_id, usuario_id)
);

-- 14. Creación de Tabla: solicitudes
CREATE TABLE solicitudes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    edad INT NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_estado_solicitud CHECK (estado IN ('pendiente', 'contactado', 'descartado'))
);

-- 15. Creación de Tabla: fraternidades
CREATE TABLE fraternidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    departamento VARCHAR(100) NOT NULL,
    parroquia VARCHAR(255) DEFAULT '',
    zona VARCHAR(50) NOT NULL DEFAULT 'centro',
    contacto VARCHAR(255) DEFAULT '',
    telefono VARCHAR(20) DEFAULT '',
    enlace_social TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_zona CHECK (zona IN ('norte', 'centro', 'sur', 'sur_altiplano', 'lima_callao_sur_medio'))
);

-- 16. Creación de Tabla: web_config
CREATE TABLE web_config (
    id INT PRIMARY KEY DEFAULT 1,
    hero_title TEXT DEFAULT 'Juventud Franciscana - Pomalca',
    hero_subtitle TEXT DEFAULT 'Siguiendo los pasos de San Francisco de Asís y Santa Clara, viviendo el Evangelio en fraternidad, paz y bien.',
    mision TEXT DEFAULT 'Vivimos una fe alegre y sencilla, encontrando a Dios en la creación y en el servicio a los hermanos más necesitados.',
    vision TEXT DEFAULT 'Crecemos juntos en el conocimiento del Evangelio y el carisma franciscano para ser instrumentos de paz en el mundo.',
    valores TEXT DEFAULT 'No caminamos solos. Formamos una familia que se apoya, celebra y vive en comunión constante.',
    frase_inspiradora TEXT DEFAULT '"Comienza haciendo lo que es necesario, después lo que es posible y de repente estarás haciendo lo imposible."',
    autor_frase VARCHAR(100) DEFAULT 'San Francisco de Asís',
    email_contacto VARCHAR(255) DEFAULT 'jufrapomalca@gmail.com',
    telefono_contacto VARCHAR(20) DEFAULT '+51 981 574 685',
    map_query TEXT DEFAULT 'Parroquia San Juan Maria Vianney, Pomalca, Chiclayo',
    familia_titulo TEXT DEFAULT 'Fraternidad OFS Santa Isabel de Hungría - Chiclayo',
    familia_descripcion TEXT DEFAULT 'Caminamos junto a nuestros hermanos mayores de la Orden Franciscana Seglar, quienes nos acompañan y guían en nuestro camino de fe y servicio.',
    ofs_hero_title TEXT DEFAULT 'Fraternidad OFS Santa Isabel de Hungría',
    ofs_hero_subtitle TEXT DEFAULT 'Orden Franciscana Seglar: Viviendo el Evangelio en medio del mundo.',
    ofs_map_query TEXT DEFAULT 'Convento San Antonio de Padua, Chiclayo, Perú',
    facebook_url TEXT DEFAULT '',
    instagram_url TEXT DEFAULT '',
    whatsapp_url TEXT DEFAULT '',
    tiktok_url TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT solo_una_fila CHECK (id = 1)
);

-- Insertar configuración inicial por defecto
INSERT INTO web_config (id) VALUES (1) ON CONFLICT DO NOTHING;

-- 17. Creación de Tabla: ofs_config
CREATE TABLE ofs_config (
    id INT PRIMARY KEY DEFAULT 1,
    hero_title TEXT DEFAULT 'Fraternidad OFS Santa Isabel de Hungría',
    hero_subtitle TEXT DEFAULT 'Orden Franciscana Seglar: Viviendo el Evangelio en medio del mundo.',
    map_query TEXT DEFAULT 'Convento San Antonio de Padua, Chiclayo, Perú',
    quienes_somos TEXT DEFAULT 'Caminamos junto a nuestros hermanos mayores de la Orden Franciscana Seglar, quienes nos acompañan y guían en nuestro camino de fe y servicio.',
    footer_direccion TEXT DEFAULT 'Convento San Antonio de Padua, Chiclayo, Perú',
    footer_email VARCHAR(255) DEFAULT 'jufrapomalca@gmail.com',
    footer_telefono VARCHAR(20) DEFAULT '+51 979 948 528',
    banner_title VARCHAR(255) DEFAULT '',
    banner_description TEXT DEFAULT '',
    banner_image TEXT DEFAULT '',
    banner_active BOOLEAN DEFAULT FALSE,
    banner_link TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT solo_una_fila_ofs CHECK (id = 1)
);

-- Insertar configuración inicial por defecto
INSERT INTO ofs_config (id) VALUES (1) ON CONFLICT DO NOTHING;
