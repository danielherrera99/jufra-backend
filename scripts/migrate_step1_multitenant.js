const db = require('../db');

async function migrate() {
    try {
        console.log('🚀 Iniciando Paso 1: Migración Multi-Tenant para Usuarios...');

        // 1. Obtener ID de JUFRA POMALCA
        const pomalca = await db('fraternidades')
            .whereRaw('UPPER(nombre) LIKE ?', ['%POMALCA%'])
            .first();

        if (!pomalca) {
            throw new Error('No se encontró la fraternidad JUFRA POMALCA en la base de datos.');
        }
        console.log(`📍 Fraternidad base encontrada: ${pomalca.nombre} (ID: ${pomalca.id})`);

        // 2. Verificar si la columna fraternidad_id existe en usuarios
        const hasColumn = await db.schema.hasColumn('usuarios', 'fraternidad_id');
        if (!hasColumn) {
            console.log('➕ Agregando columna fraternidad_id a la tabla usuarios...');
            await db.schema.alterTable('usuarios', table => {
                table.uuid('fraternidad_id')
                    .nullable()
                    .references('id')
                    .inTable('fraternidades')
                    .onDelete('SET NULL');
            });
            console.log('✅ Columna fraternidad_id agregada con éxito.');
        } else {
            console.log('ℹ️ La columna fraternidad_id ya existe en usuarios.');
        }

        // 3. Asignar por defecto a todos los usuarios existentes a Jufra Pomalca
        const updatedCount = await db('usuarios')
            .whereNull('fraternidad_id')
            .update({ fraternidad_id: pomalca.id });
        console.log(`✅ ${updatedCount} usuarios vinculados por defecto a JUFRA POMALCA.`);

        // 4. Actualizar constraint check_rol para incluir superadmin y admin_nacional
        console.log('🔄 Actualizando constraint check_rol para permitir superadmin...');
        await db.raw(`
            ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS check_rol;
            ALTER TABLE usuarios ADD CONSTRAINT check_rol 
            CHECK (rol IN ('superadmin', 'admin_nacional', 'admin', 'consejo', 'miembro'));
        `);
        console.log('✅ Constraint check_rol actualizado.');

        // 5. Asignar rol de 'superadmin' a Daniel
        const updatedSuperAdmins = await db('usuarios')
            .where('email', 'dh19992015@gmail.com')
            .orWhere('username', 'francisco')
            .orWhere('username', 'Herrera')
            .update({ rol: 'superadmin' });

        console.log(`👑 Rol superadmin asignado a ${updatedSuperAdmins} cuenta(s) de Daniel.`);

        // 5. Verificar estado final de usuarios
        const users = await db('usuarios')
            .leftJoin('fraternidades', 'usuarios.fraternidad_id', 'fraternidades.id')
            .select(
                'usuarios.id',
                'usuarios.username',
                'usuarios.email',
                'usuarios.nombre',
                'usuarios.apellido',
                'usuarios.rol',
                'fraternidades.nombre as fraternidad_nombre'
            );

        console.log('\n📊 Resumen de usuarios:');
        console.table(users);

        console.log('\n🎉 ¡Paso 1 de base de datos completado exitosamente!');
    } catch (err) {
        console.error('❌ Error en migración:', err);
    } finally {
        await db.destroy();
        process.exit();
    }
}

migrate();
