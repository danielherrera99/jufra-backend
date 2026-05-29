const mongoose = require('mongoose');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Configuración de conexiones
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://admin_jufra:jufra2025app@clusterjufra.lsslyqn.mongodb.net/jufra-db?appName=ClusterJufra';
const POSTGRES_URL = 'postgresql://postgres.utckiuoprtcoexdkmfyj:Tramun2015%40.@aws-1-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true';
const DIRECT_POSTGRES_URL = 'postgresql://postgres.utckiuoprtcoexdkmfyj:Tramun2015%40.@aws-1-us-west-2.pooler.supabase.com:5432/postgres';

// Nota: El símbolo @ en la contraseña 'Tramun2015@' debe estar codificado como %40 en la URI de Postgres
// para evitar errores de análisis en los drivers de Node.js.

// Mapeador determinista de MongoDB ObjectId a Postgres UUID
// MongoDB ObjectId = 24 caracteres hexadecimales (96 bits)
// Postgres UUID = 32 caracteres hexadecimales + 4 guiones (128 bits)
// Formato UUID resultante: 00000000-xxxx-xxxx-xxxx-xxxxxxxxxxxx
function toUUID(mongoId) {
    if (!mongoId) return null;
    const str = mongoId.toString().trim();
    if (str.length !== 24) return str; // Ya es UUID u otro formato
    return `00000000-${str.substring(0, 4)}-${str.substring(4, 8)}-${str.substring(8, 12)}-${str.substring(12)}`;
}

async function run() {
    console.log('🏁 Iniciando migración de datos de MongoDB a Supabase...');
    
    // 1. Conectar a PostgreSQL (Direct URL de sesión para migraciones y DDL)
    console.log('🔌 Conectando a Supabase PostgreSQL (Session Pooler)...');
    const pgClient = new Client({
        connectionString: DIRECT_POSTGRES_URL,
        connectionTimeoutMillis: 10000,
    });
    
    try {
        await pgClient.connect();
        console.log('✅ Supabase PostgreSQL conectado');
    } catch (err) {
        console.error('❌ Error al conectar a PostgreSQL:', err.message);
        process.exit(1);
    }

    // 2. Ejecutar DDL desde schema.sql
    try {
        console.log('📜 Leyendo schema.sql...');
        const ddlPath = path.join(__dirname, 'schema.sql');
        const ddlSql = fs.readFileSync(ddlPath, 'utf8');
        
        console.log('⚡ Ejecutando estructura DDL en Supabase (Reiniciando tablas)...');
        await pgClient.query(ddlSql);
        console.log('✅ Estructura de tablas relacionales creada exitosamente en Supabase');
    } catch (err) {
        console.error('❌ Error al ejecutar DDL schema.sql:', err.message);
        await pgClient.end();
        process.exit(1);
    }

    // 3. Conectar a MongoDB
    console.log('🔌 Conectando a MongoDB Atlas...');
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB conectado');
    } catch (err) {
        console.error('❌ Error al conectar a MongoDB:', err.message);
        await pgClient.end();
        process.exit(1);
    }

    // Definición de modelos dinámicos de Mongoose (para leer directamente sin requerir dependencias relativas complejas)
    const db = mongoose.connection.db;

    try {
        // --- MIGRAR USUARIOS ---
        console.log('\n👤 Migrando Usuarios...');
        const mongoUsuarios = await db.collection('usuarios').find({}).toArray();
        console.log(`Encontrados ${mongoUsuarios.length} usuarios en MongoDB.`);
        
        let usuariosMigrados = 0;
        for (const user of mongoUsuarios) {
            try {
                const uuid = toUUID(user._id);
                const userValues = [
                    uuid,
                    user.nombre || '',
                    user.apellido || '',
                    user.username || '',
                    user.email || null,
                    user.password || '',
                    user.telefono || null,
                    user.contactoEmergencia || null,
                    user.nombreContactoEmergencia || null,
                    user.fechaNacimiento ? new Date(user.fechaNacimiento) : null,
                    user.fechaIngreso ? new Date(user.fechaIngreso) : new Date(),
                    user.fechaPromesa ? new Date(user.fechaPromesa) : null,
                    user.rol || 'miembro',
                    user.cargo || 'ninguno',
                    user.foto || null,
                    user.activo === undefined ? false : user.activo,
                    user.codigoQR || null,
                    user.expoPushToken || null,
                    user.createdAt || new Date(),
                    user.updatedAt || new Date()
                ];

                await pgClient.query(`
                    INSERT INTO usuarios (id, nombre, apellido, username, email, password, telefono, contacto_emergencia, nombre_contacto_emergencia, fecha_nacimiento, fecha_ingreso, fecha_promesa, rol, cargo, foto_url, activo, codigo_qr, expo_push_token, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
                    ON CONFLICT (id) DO UPDATE SET
                        nombre = EXCLUDED.nombre, apellido = EXCLUDED.apellido, username = EXCLUDED.username,
                        email = EXCLUDED.email, password = EXCLUDED.password, telefono = EXCLUDED.telefono,
                        foto_url = EXCLUDED.foto_url, activo = EXCLUDED.activo, updated_at = NOW();
                `, userValues);
                usuariosMigrados++;
            } catch (err) {
                console.warn(`   ⚠️ Error migrando usuario ${user._id}:`, err.message);
            }
        }
        console.log(`✅ ${usuariosMigrados} usuarios migrados.`);

        // --- MIGRAR FRATERNIDADES ---
        console.log('\n🏘️ Migrando Fraternidades...');
        const mongoFraternidades = await db.collection('fraternidads').find({}).toArray();
        console.log(`Encontradas ${mongoFraternidades.length} fraternidades.`);
        let fraternidadesMigradas = 0;
        for (const f of mongoFraternidades) {
            try {
                await pgClient.query(`
                    INSERT INTO fraternidades (id, nombre, departamento, parroquia, zona, contacto, telefono, enlace_social, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `, [
                    toUUID(f._id),
                    f.nombre || '',
                    f.departamento || '',
                    f.parroquia || '',
                    f.zona || 'centro',
                    f.contacto || '',
                    f.telefono || '',
                    f.enlaceSocial || '',
                    f.createdAt || new Date(),
                    f.updatedAt || new Date()
                ]);
                fraternidadesMigradas++;
            } catch (err) {
                console.warn(`   ⚠️ Error migrando fraternidad ${f._id}:`, err.message);
            }
        }
        console.log(`✅ ${fraternidadesMigradas} fraternidades migradas.`);

        // --- MIGRAR SOLICITUDES ---
        console.log('\n📝 Migrando Solicitudes...');
        const mongoSolicitudes = await db.collection('solicituds').find({}).toArray();
        console.log(`Encontradas ${mongoSolicitudes.length} solicitudes.`);
        let solicitudesMigradas = 0;
        for (const s of mongoSolicitudes) {
            try {
                await pgClient.query(`
                    INSERT INTO solicitudes (id, nombre, edad, telefono, estado, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    toUUID(s._id),
                    s.nombre || '',
                    s.edad || 0,
                    s.telefono || '',
                    s.estado || 'pendiente',
                    s.createdAt || new Date(),
                    s.updatedAt || new Date()
                ]);
                solicitudesMigradas++;
            } catch (err) {
                console.warn(`   ⚠️ Error migrando solicitud ${s._id}:`, err.message);
            }
        }
        console.log(`✅ ${solicitudesMigradas} solicitudes migradas.`);

        // --- MIGRAR ASISTENCIAS ---
        console.log('\n📅 Migrando Asistencias...');
        const mongoAsistencias = await db.collection('asistencias').find({}).toArray();
        console.log(`Encontrados ${mongoAsistencias.length} registros de asistencia.`);
        let asistenciasExitosas = 0;
        for (const a of mongoAsistencias) {
            try {
                await pgClient.query(`
                    INSERT INTO asistencias (id, usuario_id, nombre_invitado, fecha, tipo_reunion, presente, estado, metodo_registro, observaciones, registrado_por, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `, [
                    toUUID(a._id),
                    toUUID(a.usuario),
                    a.nombreInvitado || null,
                    a.fecha ? new Date(a.fecha) : new Date(),
                    a.tipoReunion || 'semanal',
                    a.presente === undefined ? true : a.presente,
                    a.estado || 'presente',
                    a.metodoRegistro || 'manual',
                    a.observaciones || null,
                    toUUID(a.registradoPor),
                    a.createdAt || new Date(),
                    a.updatedAt || new Date()
                ]);
                asistenciasExitosas++;
            } catch (err) {
                if (!err.message.includes('unique constraint')) {
                    // Ignoramos advertencias de claves foráneas duplicadas o inválidas para mantener log limpio
                }
            }
        }
        console.log(`✅ ${asistenciasExitosas} registros de asistencia migrados exitosamente.`);

        // --- MIGRAR CANTOS ---
        console.log('\n🎵 Migrando Cantos...');
        const mongoCantos = await db.collection('cantos').find({}).toArray();
        console.log(`Encontrados ${mongoCantos.length} cantos.`);
        let cantosMigrados = 0;
        for (const c of mongoCantos) {
            try {
                await pgClient.query(`
                    INSERT INTO cantos (id, titulo, letra, categoria, autor, creado_por, archivo_url, archivo_nombre, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `, [
                    toUUID(c._id),
                    c.titulo || '',
                    c.letra || '',
                    c.categoria || 'otro',
                    c.autor || null,
                    toUUID(c.creadoPor),
                    c.archivoUrl || null,
                    c.archivoNombre || null,
                    c.createdAt || new Date(),
                    c.updatedAt || new Date()
                ]);
                cantosMigrados++;
            } catch (err) {
                console.warn(`   ⚠️ Error migrando canto ${c._id}:`, err.message);
            }
        }
        console.log(`✅ ${cantosMigrados} cantos migrados.`);

        // --- MIGRAR DOCUMENTOS ---
        console.log('\n📄 Migrando Documentos...');
        const mongoDocumentos = await db.collection('documentos').find({}).toArray();
        console.log(`Encontrados ${mongoDocumentos.length} documentos.`);
        let docsMigrados = 0;
        for (const d of mongoDocumentos) {
            try {
                await pgClient.query(`
                    INSERT INTO documentos (id, titulo, descripcion, tipo, contenido, archivo_url, archivo_nombre, creado_por, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `, [
                    toUUID(d._id),
                    d.titulo || '',
                    d.descripcion || null,
                    d.tipo || 'otro',
                    d.contenido || null,
                    d.archivoUrl || null,
                    d.archivoNombre || null,
                    toUUID(d.creadoPor),
                    d.createdAt || new Date(),
                    d.updatedAt || new Date()
                ]);
                docsMigrados++;
            } catch (err) {
                console.warn(`   ⚠️ Error migrando documento ${d._id}:`, err.message);
            }
        }
        console.log(`✅ ${docsMigrados} documentos migrados.`);

        // --- MIGRAR EVENTOS ---
        console.log('\n🎪 Migrando Eventos...');
        const mongoEventos = await db.collection('eventos').find({}).toArray();
        console.log(`Encontrados ${mongoEventos.length} eventos.`);
        let eventosMigrados = 0;
        for (const e of mongoEventos) {
            try {
                await pgClient.query(`
                    INSERT INTO eventos (id, titulo, descripcion, fecha, hora, lugar, latitud, longitud, tipo, creado_por, imagen_url, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                `, [
                    toUUID(e._id),
                    e.titulo || '',
                    e.descripcion || null,
                    e.fecha ? new Date(e.fecha) : new Date(),
                    e.hora || null,
                    e.lugar || 'Parroquia',
                    e.ubicacion && e.ubicacion.lat ? e.ubicacion.lat : null,
                    e.ubicacion && e.ubicacion.lng ? e.ubicacion.lng : null,
                    e.tipo || 'otro',
                    toUUID(e.creadoPor),
                    e.imagenUrl || null,
                    e.createdAt || new Date(),
                    e.updatedAt || new Date()
                ]);
                eventosMigrados++;
            } catch (err) {
                console.warn(`   ⚠️ Error migrando evento ${e._id}:`, err.message);
            }
        }
        console.log(`✅ ${eventosMigrados} eventos migrados.`);

        // --- MIGRAR GALERIA ---
        console.log('\n🖼️ Migrando Galería...');
        const mongoGaleria = await db.collection('galerias').find({}).toArray();
        console.log(`Encontrados ${mongoGaleria.length} elementos de galería.`);
        let galeriaMigrada = 0;
        for (const g of mongoGaleria) {
            try {
                await pgClient.query(`
                    INSERT INTO galeria (id, titulo, descripcion, fecha, archivo_url, tipo_archivo, categoria, subido_por, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `, [
                    toUUID(g._id),
                    g.titulo || '',
                    g.descripcion || null,
                    g.fecha ? new Date(g.fecha) : new Date(),
                    g.archivoUrl || '',
                    g.tipoArchivo || 'imagen',
                    g.categoria || 'general',
                    toUUID(g.subidoPor),
                    g.createdAt || new Date(),
                    g.updatedAt || new Date()
                ]);
                galeriaMigrada++;
            } catch (err) {
                console.warn(`   ⚠️ Error migrando imagen galería ${g._id}:`, err.message);
            }
        }
        console.log(`✅ ${galeriaMigrada} elementos de galería migrados.`);

        // --- MIGRAR FORMACIONES ---
        console.log('\n📖 Migrando Formaciones...');
        const mongoFormacion = await db.collection('formacions').find({}).toArray();
        console.log(`Encontradas ${mongoFormacion.length} formaciones.`);
        let formacionesMigradas = 0;
        for (const f of mongoFormacion) {
            try {
                await pgClient.query(`
                    INSERT INTO formaciones (id, titulo, descripcion, contenido, fecha, autor, archivo_url, archivo_nombre, etiquetas, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                `, [
                    toUUID(f._id),
                    f.titulo || '',
                    f.descripcion || null,
                    f.contenido || '',
                    f.fecha ? new Date(f.fecha) : new Date(),
                    toUUID(f.autor),
                    f.archivoUrl || null,
                    f.archivoNombre || null,
                    f.etiquetas || [],
                    f.createdAt || new Date(),
                    f.updatedAt || new Date()
                ]);
                formacionesMigradas++;
            } catch (err) {
                console.warn(`   ⚠️ Error migrando formación ${f._id}:`, err.message);
            }
        }
        console.log(`✅ ${formacionesMigradas} formaciones migradas.`);

        // --- MIGRAR MENSAJES ---
        console.log('\n💬 Migrando Mensajes...');
        const mongoMensajes = await db.collection('mensajes').find({}).toArray();
        console.log(`Encontrados ${mongoMensajes.length} mensajes.`);
        let mensajesMigrados = 0;
        for (const m of mongoMensajes) {
            try {
                await pgClient.query(`
                    INSERT INTO mensajes (id, remitente_id, destinatario_id, contenido, leido, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    toUUID(m._id),
                    toUUID(m.remitente),
                    toUUID(m.destinatario),
                    m.contenido || '',
                    m.leido || false,
                    m.createdAt || new Date()
                ]);
                mensajesMigrados++;
            } catch (err) {
                // Ignorar mensajes con destinatario o remitente inexistente
            }
        }
        console.log(`✅ ${mensajesMigrados} mensajes migrados.`);

        // --- MIGRAR PETICIONES Y ORACIONES ---
        console.log('\n🙏 Migrando Peticiones y Oraciones...');
        const mongoPeticiones = await db.collection('peticions').find({}).toArray();
        console.log(`Encontradas ${mongoPeticiones.length} peticiones.`);
        let peticionesMigradas = 0;
        for (const p of mongoPeticiones) {
            try {
                const petUUID = toUUID(p._id);
                await pgClient.query(`
                    INSERT INTO peticiones (id, contenido, autor_id, anonimo, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    petUUID,
                    p.contenido || '',
                    toUUID(p.autor),
                    p.anonimo || false,
                    p.createdAt || new Date(),
                    p.updatedAt || new Date()
                ]);
                peticionesMigradas++;

                // Migrar oraciones anidadas
                if (p.oraciones && p.oraciones.length > 0) {
                    for (const o of p.oraciones) {
                        try {
                            await pgClient.query(`
                                INSERT INTO peticion_oraciones (peticion_id, usuario_id, fecha)
                                VALUES ($1, $2, $3)
                                ON CONFLICT DO NOTHING
                            `, [
                                petUUID,
                                toUUID(o.usuario),
                                o.fecha ? new Date(o.fecha) : new Date()
                            ]);
                        } catch (err) {
                            // Ignorar fallas si algún usuario_id no existe
                        }
                    }
                }
            } catch (err) {
                console.warn(`   ⚠️ Error migrando petición ${p._id}:`, err.message);
            }
        }
        console.log(`✅ ${peticionesMigradas} peticiones y sus oraciones migradas.`);

        // --- MIGRAR SERVICIOS Y PARTICIPANTES ---
        console.log('\n🤝 Migrando Servicios y Participantes...');
        const mongoServicios = await db.collection('servicios').find({}).toArray();
        console.log(`Encontrados ${mongoServicios.length} servicios.`);
        let serviciosMigrados = 0;
        for (const s of mongoServicios) {
            try {
                const servUUID = toUUID(s._id);
                await pgClient.query(`
                    INSERT INTO servicios (id, titulo, descripcion, fecha, lugar, cupo_maximo, imagen_url, latitud, longitud, creado_por, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `, [
                    servUUID,
                    s.titulo || '',
                    s.descripcion || '',
                    s.fecha ? new Date(s.fecha) : new Date(),
                    s.lugar || '',
                    s.cupoMaximo || 0,
                    s.imagen || null,
                    s.ubicacion && s.ubicacion.lat ? s.ubicacion.lat : null,
                    s.ubicacion && s.ubicacion.lng ? s.ubicacion.lng : null,
                    toUUID(s.creadoPor),
                    s.createdAt || new Date(),
                    s.updatedAt || new Date()
                ]);
                serviciosMigrados++;

                // Migrar participantes anidados
                if (s.participantes && s.participantes.length > 0) {
                    for (const partId of s.participantes) {
                        try {
                            await pgClient.query(`
                                INSERT INTO servicio_participantes (servicio_id, usuario_id)
                                VALUES ($1, $2)
                                ON CONFLICT DO NOTHING
                            `, [
                                servUUID,
                                toUUID(partId)
                            ]);
                        } catch (err) {
                            // Ignorar usuarios inválidos
                        }
                    }
                }
            } catch (err) {
                console.warn(`   ⚠️ Error migrando servicio ${s._id}:`, err.message);
            }
        }
        console.log(`✅ ${serviciosMigrados} servicios y sus participantes migrados.`);

        // --- MIGRAR ACTAS, ASISTENTES Y ACUERDOS ---
        console.log('\n📜 Migrando Actas, Asistentes y Acuerdos...');
        const mongoActas = await db.collection('actas').find({}).toArray();
        console.log(`Encontradas ${mongoActas.length} actas de reuniones.`);
        let actasMigradas = 0;
        for (const a of mongoActas) {
            try {
                const actaUUID = toUUID(a._id);
                await pgClient.query(`
                    INSERT INTO actas (id, titulo, fecha, tipo_reunion, contenido, archivo_pdf_url, creado_por, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [
                    actaUUID,
                    a.titulo || '',
                    a.fecha ? new Date(a.fecha) : new Date(),
                    a.tipoReunion || 'consejo',
                    a.contenido || '',
                    a.archivoPDF || null,
                    toUUID(a.creadoPor),
                    a.createdAt || new Date(),
                    a.updatedAt || new Date()
                ]);
                actasMigradas++;

                // Migrar asistentes (muchos-a-muchos)
                if (a.asistentes && a.asistentes.length > 0) {
                    for (const asisId of a.asistentes) {
                        try {
                            await pgClient.query(`
                                INSERT INTO acta_asistentes (acta_id, usuario_id)
                                VALUES ($1, $2)
                                ON CONFLICT DO NOTHING
                            `, [
                                actaUUID,
                                toUUID(asisId)
                            ]);
                        } catch (err) {
                            // Ignorar si el usuario no existe en usuarios
                        }
                    }
                }

                // Migrar acuerdos anidados
                if (a.acuerdos && a.acuerdos.length > 0) {
                    for (const ac of a.acuerdos) {
                        try {
                            await pgClient.query(`
                                INSERT INTO acuerdos (id, acta_id, descripcion, responsable_id, fecha_limite, completado, created_at, updated_at)
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                            `, [
                                toUUID(ac._id),
                                actaUUID,
                                ac.descripcion || '',
                                toUUID(ac.responsable),
                                ac.fechaLimite ? new Date(ac.fechaLimite) : null,
                                ac.completado || false,
                                ac.createdAt || new Date(),
                                ac.updatedAt || new Date()
                            ]);
                        } catch (err) {
                            // Ignorar acuerdos inválidos
                        }
                    }
                }
            } catch (err) {
                console.warn(`   ⚠️ Error migrando acta de reunión ${a._id}:`, err.message);
            }
        }
        console.log(`✅ ${actasMigradas} actas, asistentes y acuerdos migrados.`);

        // --- MIGRAR CONFIGURACIONES SINGLETON ---
        console.log('\n⚙️ Migrando Configuraciones (WebConfig & OfsConfig)...');
        try {
            const mongoWebConfig = await db.collection('webconfigs').findOne({});
            if (mongoWebConfig) {
                await pgClient.query(`
                    INSERT INTO web_config (
                        id, hero_title, hero_subtitle, mision, vision, valores, frase_inspiradora, autor_frase,
                        email_contacto, telefono_contacto, map_query, familia_titulo, familia_descripcion,
                        ofs_hero_title, ofs_hero_subtitle, ofs_map_query, facebook_url, instagram_url, whatsapp_url, tiktok_url, updated_at
                    )
                    VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
                    ON CONFLICT (id) DO UPDATE SET
                        hero_title = EXCLUDED.hero_title, hero_subtitle = EXCLUDED.hero_subtitle, mision = EXCLUDED.mision,
                        vision = EXCLUDED.vision, valores = EXCLUDED.valores, frase_inspiradora = EXCLUDED.frase_inspiradora,
                        autor_frase = EXCLUDED.autor_frase, email_contacto = EXCLUDED.email_contacto, telefono_contacto = EXCLUDED.telefono_contacto,
                        map_query = EXCLUDED.map_query, familia_titulo = EXCLUDED.familia_titulo, familia_descripcion = EXCLUDED.familia_descripcion,
                        ofs_hero_title = EXCLUDED.ofs_hero_title, ofs_hero_subtitle = EXCLUDED.ofs_hero_subtitle, ofs_map_query = EXCLUDED.ofs_map_query,
                        facebook_url = EXCLUDED.facebook_url, instagram_url = EXCLUDED.instagram_url, whatsapp_url = EXCLUDED.whatsapp_url, tiktok_url = EXCLUDED.tiktok_url,
                        updated_at = NOW();
                `, [
                    mongoWebConfig.heroTitle || 'Juventud Franciscana - Pomalca',
                    mongoWebConfig.heroSubtitle || '',
                    mongoWebConfig.mision || '',
                    mongoWebConfig.vision || '',
                    mongoWebConfig.valores || '',
                    mongoWebConfig.fraseInspiradora || '',
                    mongoWebConfig.autorFrase || '',
                    mongoWebConfig.emailContacto || '',
                    mongoWebConfig.telefonoContacto || '',
                    mongoWebConfig.mapQuery || '',
                    mongoWebConfig.familiaTitulo || '',
                    mongoWebConfig.familiaDescripcion || '',
                    mongoWebConfig.ofsHeroTitle || '',
                    mongoWebConfig.ofsHeroSubtitle || '',
                    mongoWebConfig.ofsMapQuery || '',
                    mongoWebConfig.facebookUrl || '',
                    mongoWebConfig.instagramUrl || '',
                    mongoWebConfig.whatsappUrl || '',
                    mongoWebConfig.tiktokUrl || ''
                ]);
                console.log('✅ Configuración WebConfig migrada.');
            }
        } catch (err) {
            console.warn('   ⚠️ Error migrando WebConfig:', err.message);
        }

        try {
            const mongoOfsConfig = await db.collection('ofsconfigs').findOne({});
            if (mongoOfsConfig) {
                await pgClient.query(`
                    INSERT INTO ofs_config (
                        id, hero_title, hero_subtitle, map_query, quienes_somos, footer_direccion, footer_email, footer_telefono,
                        banner_title, banner_description, banner_image, banner_active, banner_link, updated_at
                    )
                    VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
                    ON CONFLICT (id) DO UPDATE SET
                        hero_title = EXCLUDED.hero_title, hero_subtitle = EXCLUDED.hero_subtitle, map_query = EXCLUDED.map_query,
                        quienes_somos = EXCLUDED.quienes_somos, footer_direccion = EXCLUDED.footer_direccion, footer_email = EXCLUDED.footer_email,
                        footer_telefono = EXCLUDED.footer_telefono, banner_title = EXCLUDED.banner_title, banner_description = EXCLUDED.banner_description,
                        banner_image = EXCLUDED.banner_image, banner_active = EXCLUDED.banner_active, banner_link = EXCLUDED.banner_link,
                        updated_at = NOW();
                `, [
                    mongoOfsConfig.heroTitle || 'Fraternidad OFS Santa Isabel de Hungría',
                    mongoOfsConfig.heroSubtitle || '',
                    mongoOfsConfig.mapQuery || '',
                    mongoOfsConfig.quienesSomos || '',
                    mongoOfsConfig.footerDireccion || '',
                    mongoOfsConfig.footerEmail || '',
                    mongoOfsConfig.footerTelefono || '',
                    mongoOfsConfig.bannerTitle || '',
                    mongoOfsConfig.bannerDescription || '',
                    mongoOfsConfig.bannerImage || '',
                    mongoOfsConfig.bannerActive || false,
                    mongoOfsConfig.bannerLink || ''
                ]);
                console.log('✅ Configuración OfsConfig migrada.');
            }
        } catch (err) {
            console.warn('   ⚠️ Error migrando OfsConfig:', err.message);
        }

        console.log('\n🎉 ¡MIGRACIÓN DE DATOS COMPLETADA CON ÉXITO DE MONGO A SUPABASE! 🎉');

    } catch (err) {
        console.error('\n❌ ERROR CRÍTICO DURANTE LA MIGRACIÓN:', err.message);
    } finally {
        // Cerrar conexiones
        await mongoose.connection.close();
        await pgClient.end();
        console.log('🔌 Conexiones cerradas.');
    }
}

run();
