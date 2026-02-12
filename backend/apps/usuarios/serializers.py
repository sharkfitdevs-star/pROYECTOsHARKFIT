from rest_framework import serializers
from django.contrib.auth.models import User
from apps.usuarios.models import PerfilUsuario


class PerfilUsuarioSerializer(serializers.ModelSerializer):
    """Serializer para PerfilUsuario"""
    
    class Meta:
        model = PerfilUsuario
        fields = [
            'id', 'user', 'telefono', 'documento', 'fecha_nacimiento',
            'rol', 'departamento', 'puesto', 'estado',
            'puede_ver_todas_ventas', 'puede_ver_reportes',
            'puede_crear_usuarios', 'puede_modificar_configuracion',
            'foto', 'notificaciones_email', 'notificaciones_whatsapp',
            'recibir_resumenes_diarios', 'hora_resumen_diario',
            'ultimo_acceso', 'fecha_inicio_contrato', 'fecha_fin_contrato',
            'created_at', 'updated_at', 'es_admin', 'es_gerente',
            'es_vendedor', 'nombre_completo'
        ]
        read_only_fields = ['created_at', 'updated_at', 'ultimo_acceso']


class UsuarioSerializer(serializers.ModelSerializer):
    """Serializer para User con PerfilUsuario"""
    
    perfil = PerfilUsuarioSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_active', 'is_staff', 'date_joined', 'perfil'
        ]
        read_only_fields = ['id', 'date_joined']


class UsuarioCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear usuarios"""
    
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'password', 'password_confirm'
        ]
    
    def validate(self, data):
        """Validar que las contraseñas coincidan"""
        if data['password'] != data.pop('password_confirm'):
            raise serializers.ValidationError("Las contraseñas no coinciden.")
        return data
    
    def create(self, validated_data):
        """Crear usuario con contraseña hasheada"""
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UsuarioUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualizar usuario"""
    
    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name'
        ]


class UsuarioChangePasswordSerializer(serializers.Serializer):
    """Serializer para cambiar contraseña"""
    
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True, min_length=8)
    
    def validate(self, data):
        """Validar que contraseñas nuevas coincidan"""
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError("Las nuevas contraseñas no coinciden.")
        return data


class LoginSerializer(serializers.Serializer):
    """Serializer para login"""
    
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
