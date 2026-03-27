package org.example.ams_be.support;

import java.beans.IntrospectionException;
import java.beans.Introspector;
import java.beans.PropertyDescriptor;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

public final class ModelCoverageAssertions {

    private ModelCoverageAssertions() {
    }

    public static <T> void assertPojoCoverage(Class<T> type) {
        assertNoArgsAccessors(type);
        assertAllArgsConstructor(type);
        assertBuilder(type);
        assertEqualsHashCode(type);
        assertToString(type);
    }

    public static <T> T instantiateAndPopulate(Class<T> type, int seed) {
        Constructor<T> noArgsConstructor = getNoArgsConstructor(type);
        if (noArgsConstructor != null) {
            T instance = instantiate(noArgsConstructor);
            populateMembers(instance, seed, 0);
            return instance;
        }

        Method builderMethod = getBuilderMethod(type);
        if (builderMethod != null) {
            return buildWithBuilder(type, seed);
        }

        Constructor<?> constructor = Arrays.stream(type.getDeclaredConstructors())
                .filter(c -> c.getParameterCount() > 0)
                .filter(c -> c.getParameterCount() == getInstanceFields(type).size())
                .max((a, b) -> Integer.compare(a.getParameterCount(), b.getParameterCount()))
                .orElseThrow(() -> new IllegalStateException("No usable constructor for " + type.getName()));

        List<Field> fields = getInstanceFields(type);
        Object[] args = new Object[fields.size()];
        for (int i = 0; i < fields.size(); i++) {
            Field field = fields.get(i);
            args[i] = sampleValue(field.getGenericType(), field.getType(), field.getName(), seed + i, 0, type);
        }
        return instantiate(constructor, args);
    }

    public static <T> void assertNoArgsAccessors(Class<T> type) {
        Constructor<T> constructor = getNoArgsConstructor(type);
        if (constructor == null) {
            return;
        }

        T instance = instantiate(constructor);
        Map<String, Object> values = populateMembers(instance, 1, 0);
        assertMembers(instance, values);
    }

    public static <T> void assertAllArgsConstructor(Class<T> type) {
        Constructor<?> constructor = Arrays.stream(type.getDeclaredConstructors())
                .filter(c -> c.getParameterCount() > 0)
                .filter(c -> c.getParameterCount() == getInstanceFields(type).size())
                .max((a, b) -> Integer.compare(a.getParameterCount(), b.getParameterCount()))
                .orElse(null);

        if (constructor == null) {
            return;
        }

        List<Field> fields = getInstanceFields(type);
        Object[] args = new Object[fields.size()];
        Map<String, Object> expected = new LinkedHashMap<>();
        for (int i = 0; i < fields.size(); i++) {
            Field field = fields.get(i);
            Object value = sampleValue(field.getGenericType(), field.getType(), field.getName(), i + 10, 0, type);
            args[i] = value;
            expected.put(field.getName(), value);
        }

        Object instance = instantiate(constructor, args);
        assertMembers(instance, expected);
    }

    public static <T> void assertBuilder(Class<T> type) {
        Method builderMethod = getBuilderMethod(type);
        if (builderMethod == null) {
            return;
        }
        Map<String, Object> expected = new LinkedHashMap<>();
        Object instance = buildWithBuilder(type, 20, expected);
        assertMembers(instance, expected);
    }

    public static <T> void assertEqualsHashCode(Class<T> type) {
        if (!declaresMethod(type, "equals", Object.class) || !declaresMethod(type, "hashCode")) {
            return;
        }

        T left = instantiateAndPopulate(type, 30);
        T same = instantiateAndPopulate(type, 30);
        T different = instantiateAndPopulate(type, 31);

        assertEquals(left, left);
        assertEquals(left, same);
        assertEquals(same, left);
        assertEquals(left.hashCode(), same.hashCode());
        assertFalse(Objects.equals(left, different));
    }

    public static <T> void assertToString(Class<T> type) {
        if (!declaresMethod(type, "toString")) {
            return;
        }

        T instance = instantiateAndPopulate(type, 40);
        String text = instance.toString();
        assertNotNull(text);
        assertTrue(text.contains(type.getSimpleName()));
    }

    private static <T> Constructor<T> getNoArgsConstructor(Class<T> type) {
        try {
            Constructor<T> constructor = type.getDeclaredConstructor();
            constructor.setAccessible(true);
            return constructor;
        } catch (NoSuchMethodException ex) {
            return null;
        }
    }

    private static <T> T instantiate(Constructor<T> constructor) {
        return instantiate(constructor, new Object[0]);
    }

    @SuppressWarnings("unchecked")
    private static <T> T instantiate(Constructor<?> constructor, Object... args) {
        try {
            constructor.setAccessible(true);
            return (T) constructor.newInstance(args);
        } catch (ReflectiveOperationException ex) {
            throw new RuntimeException(ex);
        }
    }

    private static Map<String, Object> populateMembers(Object instance, int seed, int depth) {
        Map<String, Field> fieldMap = getFieldMap(instance.getClass());
        Map<String, Object> values = new LinkedHashMap<>();

        for (PropertyDescriptor descriptor : getPropertyDescriptors(instance.getClass())) {
            Method writeMethod = descriptor.getWriteMethod();
            Method readMethod = descriptor.getReadMethod();
            if (writeMethod == null || readMethod == null || "class".equals(descriptor.getName())) {
                continue;
            }

            Field field = fieldMap.get(descriptor.getName());
            Type genericType = field != null ? field.getGenericType() : descriptor.getPropertyType();
            Object value = sampleValue(genericType, descriptor.getPropertyType(), descriptor.getName(),
                    seed + values.size(), depth, instance.getClass());
            invoke(writeMethod, instance, value);
            values.put(descriptor.getName(), value);
        }

        for (Field field : getInstanceFields(instance.getClass())) {
            if (values.containsKey(field.getName())) {
                continue;
            }
            if (!Modifier.isPublic(field.getModifiers())) {
                continue;
            }

            Object value = sampleValue(field.getGenericType(), field.getType(), field.getName(), seed + values.size(),
                    depth, instance.getClass());
            setField(field, instance, value);
            values.put(field.getName(), value);
        }

        return values;
    }

    private static void assertMembers(Object instance, Map<String, Object> expected) {
        Map<String, Field> fieldMap = getFieldMap(instance.getClass());
        for (Map.Entry<String, Object> entry : expected.entrySet()) {
            PropertyDescriptor descriptor = getPropertyDescriptor(instance.getClass(), entry.getKey());
            Object actual;
            if (descriptor != null && descriptor.getReadMethod() != null) {
                actual = invoke(descriptor.getReadMethod(), instance);
            } else {
                actual = getField(fieldMap.get(entry.getKey()), instance);
            }
            assertEquals(entry.getValue(), actual, instance.getClass().getSimpleName() + "." + entry.getKey());
        }
    }

    private static Object sampleValue(Type genericType, Class<?> rawType, String name, int seed, int depth,
            Class<?> ownerType) {
        if (rawType == String.class) {
            return name + "-" + seed;
        }
        if (rawType == Long.class || rawType == long.class) {
            return 100L + seed;
        }
        if (rawType == Integer.class || rawType == int.class) {
            return 10 + seed;
        }
        if (rawType == Boolean.class || rawType == boolean.class) {
            return seed % 2 == 0;
        }
        if (rawType == Double.class || rawType == double.class) {
            return 10.5d + seed;
        }
        if (rawType == BigDecimal.class) {
            return BigDecimal.valueOf(seed + 1L).add(BigDecimal.valueOf(0.25d));
        }
        if (rawType == LocalDate.class) {
            return LocalDate.of(2026, 1, 1).plusDays(seed);
        }
        if (rawType == LocalDateTime.class) {
            return LocalDateTime.of(2026, 1, 1, 8, 0).plusHours(seed);
        }
        if (rawType == LocalTime.class) {
            return LocalTime.of(8, 0).plusMinutes(seed);
        }
        if (List.class.isAssignableFrom(rawType)) {
            return sampleList(genericType, name, seed, depth, ownerType);
        }
        if (rawType.isEnum()) {
            Object[] constants = rawType.getEnumConstants();
            return constants[Math.floorMod(seed, constants.length)];
        }
        if (rawType == Object.class) {
            return name + "-object-" + seed;
        }
        if (rawType.getName().startsWith("org.example.ams_be") && depth < 1) {
            Constructor<?> constructor = Arrays.stream(rawType.getDeclaredConstructors())
                    .filter(c -> c.getParameterCount() == 0)
                    .findFirst()
                    .orElse(null);
            if (constructor == null) {
                return null;
            }
            Object nested = instantiate(constructor);
            populateMembers(nested, seed + 1, depth + 1);
            return nested;
        }
        return null;
    }

    private static List<?> sampleList(Type genericType, String name, int seed, int depth, Class<?> ownerType) {
        if (genericType instanceof ParameterizedType parameterizedType) {
            Type elementType = parameterizedType.getActualTypeArguments()[0];
            if (elementType instanceof Class<?> elementClass) {
                Object element = sampleValue(elementType, elementClass, name + "Item", seed, depth + 1, ownerType);
                if (element == null) {
                    return new ArrayList<>();
                }
                return new ArrayList<>(List.of(element));
            }
        }
        return new ArrayList<>(List.of(name + "-item-" + seed));
    }

    private static <T> Method getBuilderMethod(Class<T> type) {
        return Arrays.stream(type.getDeclaredMethods())
                .filter(method -> Modifier.isStatic(method.getModifiers()))
                .filter(method -> method.getName().equals("builder"))
                .findFirst()
                .orElse(null);
    }

    private static <T> T buildWithBuilder(Class<T> type, int seed) {
        return buildWithBuilder(type, seed, new LinkedHashMap<>());
    }

    private static <T> T buildWithBuilder(Class<T> type, int seed, Map<String, Object> expected) {
        Method builderMethod = getBuilderMethod(type);
        Object builder = invoke(builderMethod, null);
        for (Field field : getInstanceFields(type)) {
            try {
                Method setter = builder.getClass().getMethod(field.getName(), field.getType());
                Object value = sampleValue(field.getGenericType(), field.getType(), field.getName(),
                        seed + getInstanceFields(type).indexOf(field), 0, type);
                invoke(setter, builder, value);
                expected.put(field.getName(), value);
            } catch (NoSuchMethodException ignored) {
                // Some builders omit fields; skip them.
            }
        }
        Method buildMethod = getMethod(builder.getClass(), "build");
        return type.cast(invoke(buildMethod, builder));
    }

    private static List<Field> getInstanceFields(Class<?> type) {
        List<Field> fields = new ArrayList<>();
        for (Field field : type.getDeclaredFields()) {
            if (Modifier.isStatic(field.getModifiers()) || field.isSynthetic()
                    || "serialVersionUID".equals(field.getName())) {
                continue;
            }
            field.setAccessible(true);
            fields.add(field);
        }
        return fields;
    }

    private static Map<String, Field> getFieldMap(Class<?> type) {
        Map<String, Field> fields = new LinkedHashMap<>();
        for (Field field : getInstanceFields(type)) {
            fields.put(field.getName(), field);
        }
        return fields;
    }

    private static PropertyDescriptor[] getPropertyDescriptors(Class<?> type) {
        try {
            return Introspector.getBeanInfo(type).getPropertyDescriptors();
        } catch (IntrospectionException ex) {
            throw new RuntimeException(ex);
        }
    }

    private static PropertyDescriptor getPropertyDescriptor(Class<?> type, String name) {
        return Arrays.stream(getPropertyDescriptors(type))
                .filter(descriptor -> descriptor.getName().equals(name))
                .findFirst()
                .orElse(null);
    }

    private static boolean declaresMethod(Class<?> type, String name, Class<?>... parameterTypes) {
        try {
            Method method = type.getDeclaredMethod(name, parameterTypes);
            return !Modifier.isAbstract(method.getModifiers());
        } catch (NoSuchMethodException ex) {
            return false;
        }
    }

    private static Method getMethod(Class<?> type, String name, Class<?>... parameterTypes) {
        try {
            Method method = type.getMethod(name, parameterTypes);
            method.setAccessible(true);
            return method;
        } catch (NoSuchMethodException ex) {
            throw new RuntimeException(ex);
        }
    }

    private static Object invoke(Method method, Object target, Object... args) {
        try {
            method.setAccessible(true);
            return method.invoke(target, args);
        } catch (ReflectiveOperationException ex) {
            throw new RuntimeException(ex);
        }
    }

    private static void setField(Field field, Object target, Object value) {
        try {
            field.setAccessible(true);
            field.set(target, value);
        } catch (IllegalAccessException ex) {
            throw new RuntimeException(ex);
        }
    }

    private static Object getField(Field field, Object target) {
        try {
            field.setAccessible(true);
            return field.get(target);
        } catch (IllegalAccessException ex) {
            throw new RuntimeException(ex);
        }
    }
}
