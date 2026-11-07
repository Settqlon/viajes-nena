--
-- PostgreSQL database dump
--

-- Dumped from database version 16.4
-- Dumped by pg_dump version 16.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: auditoria; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auditoria (
    id_auditoria integer NOT NULL,
    tabla_afectada character varying,
    accion character varying,
    id_usuario integer,
    detalles character varying,
    fecha_hora timestamp without time zone NOT NULL,
    is_active boolean NOT NULL
);


ALTER TABLE public.auditoria OWNER TO postgres;

--
-- Name: auditoria_id_auditoria_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.auditoria_id_auditoria_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.auditoria_id_auditoria_seq OWNER TO postgres;

--
-- Name: auditoria_id_auditoria_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.auditoria_id_auditoria_seq OWNED BY public.auditoria.id_auditoria;


--
-- Name: clientes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clientes (
    id_cliente character varying(20) NOT NULL,
    nombre character varying NOT NULL,
    apellido character varying NOT NULL,
    telefono character varying NOT NULL,
    correo_electronico character varying NOT NULL,
    direccion character varying NOT NULL,
    is_active boolean NOT NULL,
    tipo_documento character varying DEFAULT 'Cédula'::character varying NOT NULL
);


ALTER TABLE public.clientes OWNER TO postgres;

--
-- Name: costos_viaje; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.costos_viaje (
    id_costo integer NOT NULL,
    id_viaje integer NOT NULL,
    descripcion character varying NOT NULL,
    monto numeric NOT NULL,
    is_active boolean NOT NULL
);


ALTER TABLE public.costos_viaje OWNER TO postgres;

--
-- Name: costos_viaje_id_costo_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.costos_viaje_id_costo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.costos_viaje_id_costo_seq OWNER TO postgres;

--
-- Name: costos_viaje_id_costo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.costos_viaje_id_costo_seq OWNED BY public.costos_viaje.id_costo;


--
-- Name: destinos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.destinos (
    id_destino integer NOT NULL,
    nombre_destino character varying NOT NULL,
    descripcion character varying,
    precio_base numeric NOT NULL,
    is_active boolean NOT NULL
);


ALTER TABLE public.destinos OWNER TO postgres;

--
-- Name: destinos_id_destino_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.destinos_id_destino_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.destinos_id_destino_seq OWNER TO postgres;

--
-- Name: destinos_id_destino_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.destinos_id_destino_seq OWNED BY public.destinos.id_destino;


--
-- Name: ganancias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ganancias (
    id_ganancia integer NOT NULL,
    id_viaje integer NOT NULL,
    ingresos_totales numeric NOT NULL,
    costos_totales numeric NOT NULL,
    inconvenientes_totales numeric NOT NULL,
    ganancia_neta numeric NOT NULL,
    fecha_calculo timestamp without time zone NOT NULL,
    is_active boolean NOT NULL
);


ALTER TABLE public.ganancias OWNER TO postgres;

--
-- Name: ganancias_id_ganancia_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ganancias_id_ganancia_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ganancias_id_ganancia_seq OWNER TO postgres;

--
-- Name: ganancias_id_ganancia_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ganancias_id_ganancia_seq OWNED BY public.ganancias.id_ganancia;


--
-- Name: inconvenientes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inconvenientes (
    id_inconveniente integer NOT NULL,
    id_viaje integer NOT NULL,
    descripcion character varying NOT NULL,
    monto_descontado numeric NOT NULL,
    fecha_reporte timestamp without time zone NOT NULL,
    is_active boolean NOT NULL
);


ALTER TABLE public.inconvenientes OWNER TO postgres;

--
-- Name: inconvenientes_id_inconveniente_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inconvenientes_id_inconveniente_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inconvenientes_id_inconveniente_seq OWNER TO postgres;

--
-- Name: inconvenientes_id_inconveniente_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inconvenientes_id_inconveniente_seq OWNED BY public.inconvenientes.id_inconveniente;


--
-- Name: integrantes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.integrantes (
    id_integrante integer NOT NULL,
    id_reserva integer NOT NULL,
    nombre character varying NOT NULL,
    apellido character varying NOT NULL,
    documento_id character varying NOT NULL,
    edad integer NOT NULL,
    is_active boolean NOT NULL,
    numero_asiento integer,
    tipo_documento character varying DEFAULT 'Cédula'::character varying NOT NULL
);


ALTER TABLE public.integrantes OWNER TO postgres;

--
-- Name: integrantes_id_integrante_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.integrantes_id_integrante_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.integrantes_id_integrante_seq OWNER TO postgres;

--
-- Name: integrantes_id_integrante_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.integrantes_id_integrante_seq OWNED BY public.integrantes.id_integrante;


--
-- Name: pagos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pagos (
    id_pago integer NOT NULL,
    id_reserva integer NOT NULL,
    monto numeric NOT NULL,
    metodo_pago character varying NOT NULL,
    referencia character varying NOT NULL,
    fecha_pago timestamp without time zone NOT NULL,
    is_active boolean NOT NULL
);


ALTER TABLE public.pagos OWNER TO postgres;

--
-- Name: pagos_id_pago_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pagos_id_pago_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pagos_id_pago_seq OWNER TO postgres;

--
-- Name: pagos_id_pago_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pagos_id_pago_seq OWNED BY public.pagos.id_pago;


--
-- Name: paquetes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.paquetes (
    id_paquete integer NOT NULL,
    id_destino integer,
    nombre_paquete character varying NOT NULL,
    resumen character varying,
    descripcion character varying NOT NULL,
    incluye character varying,
    no_incluye character varying,
    condiciones character varying,
    duracion_dias integer NOT NULL,
    duracion_noches integer NOT NULL,
    precio_paquete numeric NOT NULL,
    is_active boolean NOT NULL
);


ALTER TABLE public.paquetes OWNER TO postgres;

--
-- Name: paquetes_id_paquete_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.paquetes_id_paquete_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.paquetes_id_paquete_seq OWNER TO postgres;

--
-- Name: paquetes_id_paquete_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.paquetes_id_paquete_seq OWNED BY public.paquetes.id_paquete;


--
-- Name: procesos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.procesos (
    id_pro integer NOT NULL,
    id_usu integer NOT NULL,
    nom_pro character varying(100) NOT NULL,
    fec_inicio date NOT NULL,
    fec_fin date NOT NULL,
    est_pro character varying(30) NOT NULL,
    det_pro character varying,
    act_pro boolean NOT NULL
);


ALTER TABLE public.procesos OWNER TO postgres;

--
-- Name: procesos_id_pro_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.procesos_id_pro_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.procesos_id_pro_seq OWNER TO postgres;

--
-- Name: procesos_id_pro_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.procesos_id_pro_seq OWNED BY public.procesos.id_pro;


--
-- Name: reservas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reservas (
    id_reserva integer NOT NULL,
    id_cliente character varying NOT NULL,
    id_viaje integer NOT NULL,
    fecha_reserva timestamp without time zone NOT NULL,
    monto_total numeric NOT NULL,
    estatus_pago character varying NOT NULL,
    is_active boolean NOT NULL
);


ALTER TABLE public.reservas OWNER TO postgres;

--
-- Name: reservas_id_reserva_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reservas_id_reserva_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reservas_id_reserva_seq OWNER TO postgres;

--
-- Name: reservas_id_reserva_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reservas_id_reserva_seq OWNED BY public.reservas.id_reserva;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuarios (
    id_usuario integer NOT NULL,
    nombre character varying NOT NULL,
    correo_electronico character varying NOT NULL,
    contrasena character varying NOT NULL,
    rol character varying NOT NULL,
    estatus character varying NOT NULL,
    fecha_creacion timestamp without time zone NOT NULL,
    is_active boolean NOT NULL
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuarios_id_usuario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_usuario_seq OWNER TO postgres;

--
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuarios_id_usuario_seq OWNED BY public.usuarios.id_usuario;


--
-- Name: viajes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.viajes (
    id_viaje integer NOT NULL,
    id_destino integer NOT NULL,
    id_paquete integer,
    fecha_salida date NOT NULL,
    fecha_retorno date NOT NULL,
    cupos_disponibles integer NOT NULL,
    estatus character varying NOT NULL,
    is_active boolean NOT NULL,
    metodo_transporte character varying(30) DEFAULT 'Bus Cama'::character varying NOT NULL,
    cantidad_unidades integer DEFAULT 1 NOT NULL
);


ALTER TABLE public.viajes OWNER TO postgres;

--
-- Name: viajes_id_viaje_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.viajes_id_viaje_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.viajes_id_viaje_seq OWNER TO postgres;

--
-- Name: viajes_id_viaje_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.viajes_id_viaje_seq OWNED BY public.viajes.id_viaje;


--
-- Name: auditoria id_auditoria; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditoria ALTER COLUMN id_auditoria SET DEFAULT nextval('public.auditoria_id_auditoria_seq'::regclass);


--
-- Name: costos_viaje id_costo; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.costos_viaje ALTER COLUMN id_costo SET DEFAULT nextval('public.costos_viaje_id_costo_seq'::regclass);


--
-- Name: destinos id_destino; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.destinos ALTER COLUMN id_destino SET DEFAULT nextval('public.destinos_id_destino_seq'::regclass);


--
-- Name: ganancias id_ganancia; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ganancias ALTER COLUMN id_ganancia SET DEFAULT nextval('public.ganancias_id_ganancia_seq'::regclass);


--
-- Name: inconvenientes id_inconveniente; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inconvenientes ALTER COLUMN id_inconveniente SET DEFAULT nextval('public.inconvenientes_id_inconveniente_seq'::regclass);


--
-- Name: integrantes id_integrante; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integrantes ALTER COLUMN id_integrante SET DEFAULT nextval('public.integrantes_id_integrante_seq'::regclass);


--
-- Name: pagos id_pago; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagos ALTER COLUMN id_pago SET DEFAULT nextval('public.pagos_id_pago_seq'::regclass);


--
-- Name: paquetes id_paquete; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paquetes ALTER COLUMN id_paquete SET DEFAULT nextval('public.paquetes_id_paquete_seq'::regclass);


--
-- Name: procesos id_pro; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.procesos ALTER COLUMN id_pro SET DEFAULT nextval('public.procesos_id_pro_seq'::regclass);


--
-- Name: reservas id_reserva; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservas ALTER COLUMN id_reserva SET DEFAULT nextval('public.reservas_id_reserva_seq'::regclass);


--
-- Name: usuarios id_usuario; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id_usuario SET DEFAULT nextval('public.usuarios_id_usuario_seq'::regclass);


--
-- Name: viajes id_viaje; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.viajes ALTER COLUMN id_viaje SET DEFAULT nextval('public.viajes_id_viaje_seq'::regclass);


--
-- Data for Name: auditoria; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auditoria (id_auditoria, tabla_afectada, accion, id_usuario, detalles, fecha_hora, is_active) FROM stdin;
1	viajes	UPDATE	1	Actualización de Viaje #3 (Estatus: Finalizado, Cupos disp.: 49)	2026-11-03 00:06:41.579964	t
2	viajes	DELETE	1	Baja lógica de Viaje #3	2026-11-03 00:06:41.670487	t
3	viajes	UPDATE	1	Actualización de Viaje #3 (Estatus: Finalizado, Cupos disp.: 49)	2026-11-03 00:06:41.701946	t
4	costos_viaje	UPDATE	1	Actualización de costo #1 en Viaje #1: Alimentación ($150)	2026-11-03 00:06:41.968766	t
5	costos_viaje	DELETE	1	Baja lógica de costo #1 en Viaje #1	2026-11-03 00:06:42.025767	t
6	costos_viaje	UPDATE	1	Actualización de costo #1 en Viaje #1: Alimentación ($150)	2026-11-03 00:06:42.066834	t
7	inconvenientes	UPDATE	1	Actualización de inconveniente #1 en Viaje #1: Mal clima	2026-11-03 00:06:42.125144	t
8	inconvenientes	DELETE	1	Baja lógica de inconveniente #1 en Viaje #1	2026-11-03 00:06:42.171439	t
9	inconvenientes	UPDATE	1	Actualización de inconveniente #1 en Viaje #1: Mal clima	2026-11-03 00:06:42.214628	t
10	ganancias	UPDATE	1	Actualización de ganancia #2 (Viaje #2)	2026-11-03 00:06:42.251806	t
11	ganancias	DELETE	1	Baja lógica de ganancia #2 (Viaje #2)	2026-11-03 00:06:42.27735	t
12	ganancias	UPDATE	1	Actualización de ganancia #2 (Viaje #2)	2026-11-03 00:06:42.300975	t
13	reservas	DELETE	1	Baja lógica de Reserva #2 (Viaje #1)	2026-11-03 00:07:40.849611	t
14	reservas	UPDATE	1	Actualización de Reserva #2 (Viaje #1, Activa: True)	2026-11-03 00:07:40.929375	t
15	pagos	INSERT	1	Pago #97 registrado en Reserva #7: $10.00 (Zelle, Ref: TEST-QA-10) — Estatus Reserva: Abonado	2026-11-03 00:08:17.32946	t
16	pagos	UPDATE	1	Actualización de Pago #97 en Reserva #7 ($10.00, Activo: True)	2026-11-03 00:08:17.404331	t
17	pagos	DELETE	1	Anulación lógica de Pago #97 en Reserva #7 ($10.00)	2026-11-03 00:08:17.475071	t
18	pagos	UPDATE	1	Actualización de Pago #97 en Reserva #7 ($10.00, Activo: True)	2026-11-03 00:08:17.552928	t
19	pagos	DELETE	1	Anulación lógica de Pago #97 en Reserva #7 ($10.00)	2026-11-03 00:08:17.628532	t
20	integrantes	UPDATE	1	Actualización de Integrante #9 (Miguel González, Activo: True) en Reserva #4	2026-11-03 01:05:37.947828	t
21	integrantes	UPDATE	1	Actualización de Integrante #9 (Miguel González, Activo: True) en Reserva #4	2026-11-03 01:05:56.62356	t
22	integrantes	UPDATE	1	Actualización de Integrante #10 (Fernando Rodríguez, Activo: True) en Reserva #4	2026-11-03 01:06:29.352732	t
23	clientes	INSERT	1	Nuevo Cliente PAS-998877 (Elena Pérez)	2026-11-03 01:24:32.989138	t
24	reservas	INSERT	1	Nueva Reserva #108 — Cliente PAS-998877, Viaje #13 (2 viajero(s), Total $1557.50, Abono $60.00)	2026-11-03 01:26:40.294473	t
25	tasas	UPDATE	1	Tasas actualizadas — BCV: 55.2 Bs/$ | COP: 4,250.0 COP/$	2026-11-03 07:33:47.007659	t
26	pagos	INSERT	1	Pago #99 registrado en Reserva #7: $10.00 (Nequi, Ref: NEQUI-COL-998811) — Estatus Reserva: Abonado	2026-11-03 07:41:32.327551	t
27	pagos	INSERT	1	Pago #100 registrado en Reserva #7: $10.00 (Bancolombia, Ref: BANCOL-TR-554433) — Estatus Reserva: Abonado	2026-11-03 07:41:32.407828	t
28	tasas	UPDATE	1	Tasas actualizadas — BCV: 891.11 Bs/$ | COP: 3,183.0 COP/$	2026-11-03 07:46:50.556687	t
29	tasas	UPDATE	1	Tasas actualizadas — BCV: 891.11 Bs/$ | COP: 3,183.0 COP/$	2026-11-03 07:51:01.267203	t
30	pagos	INSERT	1	Pago #101 registrado en Reserva #7: $595.00 (Nequi, Ref: LIQ-TEST-7) — Estatus Reserva: Pagado	2026-11-03 08:02:00.456691	t
31	pagos	INSERT	1	Pago #102 registrado en Reserva #44: $560.00 (Transferencia, Ref: LIQ-RES-44) — Estatus Reserva: Pagado	2026-11-03 14:03:05.614956	t
32	integrantes	UPDATE	1	Actualización de Integrante #9 (Miguel González, Activo: True) en Reserva #4	2026-11-03 14:04:13.851926	t
33	integrantes	UPDATE	1	Actualización de Integrante #9 (Miguel González, Activo: True) en Reserva #4	2026-11-03 14:04:23.355111	t
34	integrantes	UPDATE	1	Actualización de Integrante #10 (Fernando Rodríguez, Activo: True) en Reserva #4	2026-11-03 14:04:40.39317	t
35	integrantes	UPDATE	1	Actualización de Integrante #10 (Fernando Rodríguez, Activo: True) en Reserva #4	2026-11-03 14:04:44.305191	t
\.


--
-- Data for Name: clientes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clientes (id_cliente, nombre, apellido, telefono, correo_electronico, direccion, is_active, tipo_documento) FROM stdin;
V-10734521	Daniela	Pérez	0414-2719583	daniela.perez1@correo.com	Maracaibo	t	Cédula
V-11469042	Luis	Torres	0414-8078673	luis.torres2@correo.com	Caracas	t	Cédula
V-12203563	María	Rodríguez	0414-4668136	maria.rodriguez3@correo.com	Valencia	t	Cédula
V-12938084	Fernando	Torres	0414-1445199	fernando.torres4@correo.com	Maracaibo	t	Cédula
V-13672605	Pedro	Mendoza	0414-8038374	pedro.mendoza5@correo.com	Valencia	t	Cédula
V-14407126	Ricardo	Torres	0414-5667265	ricardo.torres6@correo.com	Caracas	t	Cédula
V-15141647	Gabriela	Mendoza	0414-8090293	gabriela.mendoza7@correo.com	Maracay	t	Cédula
V-15876168	Andrés	Pérez	0414-4612365	andres.perez8@correo.com	Maracay	t	Cédula
V-16610689	Ana	Rodríguez	0414-7374122	ana.rodriguez9@correo.com	Caracas	t	Cédula
V-17345210	Sofía	Martínez	0414-5437923	sofia.martinez10@correo.com	Caracas	t	Cédula
V-18079731	Ricardo	Ramírez	0414-3094235	ricardo.ramirez11@correo.com	Barquisimeto	t	Cédula
V-18814252	Luis	Ramírez	0414-5918715	luis.ramirez12@correo.com	Maracaibo	t	Cédula
V-19548773	Sofía	Torres	0414-4226067	sofia.torres13@correo.com	Caracas	t	Cédula
V-20283294	José	Rojas	0414-4823498	jose.rojas14@correo.com	Maracay	t	Cédula
V-21017815	Luis	Hernández	0414-2694522	luis.hernandez15@correo.com	Barquisimeto	t	Cédula
V-21752336	Andrés	Díaz	0414-7120868	andres.diaz16@correo.com	Valencia	t	Cédula
V-22486857	Sofía	Martínez	0414-4514944	sofia.martinez17@correo.com	Maracay	t	Cédula
V-23221378	Luis	Torres	0414-3871230	luis.torres18@correo.com	Maracaibo	t	Cédula
V-23955899	Daniela	Pérez	0414-8755439	daniela.perez19@correo.com	Barquisimeto	t	Cédula
V-24690420	Andrés	Rojas	0414-4684531	andres.rojas20@correo.com	Maracay	t	Cédula
V-25424941	José	Hernández	0414-1538552	jose.hernandez21@correo.com	Maracay	t	Cédula
V-26159462	Jorge	García	0414-2110460	jorge.garcia22@correo.com	Valencia	t	Cédula
V-26893983	Diego	Mendoza	0414-6279418	diego.mendoza23@correo.com	Valencia	t	Cédula
V-27628504	Isabel	López	0414-8698256	isabel.lopez24@correo.com	Valencia	t	Cédula
V-28363025	Andrés	Pérez	0414-5137722	andres.perez25@correo.com	Maracaibo	t	Cédula
V-29097546	Lucía	García	0414-8187926	lucia.garcia26@correo.com	Maracaibo	t	Cédula
V-29832067	Jorge	Martínez	0414-4679591	jorge.martinez27@correo.com	Valencia	t	Cédula
V-30566588	Fernando	Díaz	0414-2525206	fernando.diaz28@correo.com	Caracas	t	Cédula
V-31301109	Ana	Pérez	0414-3684052	ana.perez29@correo.com	Barquisimeto	t	Cédula
27567099	kevin alejandro 	mendez colmenares	0424-7767881	karma4he@gmail.com	calle el hambre	t	Cédula
27567100	Kevin	Mendez	04147286762	Karma4eh@gmail.com	Urb San sebastian 	t	Cédula
V-10000000	Ana	González	0414-5614226	ana.gonzalez0@correo.com	Valencia	t	Cédula
PAS-998877	Elena	Pérez	0412-9988776	elena.perez@testdoc.com	Caracas	t	Pasaporte
\.


--
-- Data for Name: costos_viaje; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.costos_viaje (id_costo, id_viaje, descripcion, monto, is_active) FROM stdin;
2	1	Guía turístico	461	t
3	1	Seguro de viaje	443	t
4	2	Alimentación	216	t
5	2	Guía turístico	560	t
6	2	Transporte	653	t
7	3	Guía turístico	179	t
8	3	Seguro de viaje	795	t
9	3	Transporte	773	t
10	4	Guía turístico	459	t
11	4	Alimentación	353	t
12	4	Hospedaje	543	t
13	5	Alimentación	529	t
14	5	Transporte	372	t
15	5	Seguro de viaje	604	t
16	6	Alimentación	296	t
17	6	Transporte	729	t
18	6	Guía turístico	823	t
19	7	Alimentación	669	t
20	7	Transporte	225	t
21	7	Hospedaje	467	t
22	8	Guía turístico	521	t
23	8	Alimentación	466	t
24	8	Transporte	334	t
25	9	Alimentación	176	t
26	9	Hospedaje	340	t
27	9	Transporte	661	t
28	10	Guía turístico	857	t
29	10	Hospedaje	358	t
30	10	Seguro de viaje	570	t
31	11	Transporte	891	t
32	11	Hospedaje	837	t
33	11	Alimentación	722	t
34	12	Transporte	880	t
35	12	Alimentación	225	t
36	12	Seguro de viaje	234	t
37	13	Guía turístico	341	t
38	13	Alimentación	472	t
39	13	Transporte	611	t
40	14	Hospedaje	810	t
41	14	Seguro de viaje	236	t
42	14	Guía turístico	404	t
1	1	Alimentación	150	t
\.


--
-- Data for Name: destinos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.destinos (id_destino, nombre_destino, descripcion, precio_base, is_active) FROM stdin;
3	Mérida	Montañas andinas, teleférico y gastronomía	220	t
4	Canaima	Salto Ángel y tepuyes milenarios	650	t
5	Morrocoy	Cayos y aguas cristalinas	180	t
6	Choroní	Pueblo colonial y playa en el Parque Henri Pittier	150	t
7	Isla Tortuga	Viaje por 3 dias a la isla tortuga 	450	t
1	Los Roques	Archipiélago paradisíaco con playas de arena blanca	450	t
2	Margarita	La Perla del Caribe, playas y compras	280	t
\.


--
-- Data for Name: ganancias; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ganancias (id_ganancia, id_viaje, ingresos_totales, costos_totales, inconvenientes_totales, ganancia_neta, fecha_calculo, is_active) FROM stdin;
10	10	6240.00	1785	0	4455.00	2026-11-03 00:20:03.649208	t
11	11	12095.00	2450	103	9542.00	2026-11-03 00:20:04.033134	t
12	12	5120.00	1339	147	3634.00	2026-11-03 00:20:04.212133	t
3	3	2090	1747	0	343	2026-11-03 00:20:04.556875	t
7	7	3440.00	1361	0	2079.00	2026-11-03 14:03:05.593264	t
1	1	8712.50	1054.00	251.00	7407.50	2026-11-03 14:04:44.289191	t
2	2	10455.00	1429	211	8815.00	2026-11-03 00:20:02.221851	t
4	4	14687.50	1355	0	13332.50	2026-11-03 00:20:02.490115	t
5	5	2040.00	1505	0	535.00	2026-11-03 00:20:02.624254	t
6	6	9567.50	1848	0	7719.50	2026-11-03 00:20:02.789084	t
8	8	3080.00	1321	0	1759.00	2026-11-03 00:20:03.097429	t
9	9	3900.00	1177	0	2723.00	2026-11-03 00:20:03.301883	t
\.


--
-- Data for Name: inconvenientes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inconvenientes (id_inconveniente, id_viaje, descripcion, monto_descontado, fecha_reporte, is_active) FROM stdin;
2	2	Retraso de vuelo	211	2026-11-02 19:51:30.84735	t
3	11	Mal clima	103	2026-11-02 19:51:32.689733	t
4	12	Cambio de hotel	147	2026-11-02 19:51:32.911069	t
1	1	Mal clima	251	2026-11-02 19:51:30.514244	t
\.


--
-- Data for Name: integrantes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.integrantes (id_integrante, id_reserva, nombre, apellido, documento_id, edad, is_active, numero_asiento, tipo_documento) FROM stdin;
250	108	Elena	Pérez	PAS-998877	34	t	50	Pasaporte
251	108	Carlitos	Pérez	MENOR-PAS-998877-1	7	t	51	Sin Documento
26	12	Luis	García	V-22295699	44	t	1	Cédula
27	12	Daniela	Hernández	V-9944378	21	t	2	Cédula
28	12	Diego	Hernández	V-29103689	48	t	3	Cédula
29	12	Ana	López	V-12343090	54	t	4	Cédula
30	13	Ricardo	Torres	V-29134829	38	t	5	Cédula
31	14	Daniela	García	V-19759675	51	t	6	Cédula
32	14	Luis	Pérez	V-10061037	6	t	7	Cédula
116	50	Fernando	Ramírez	V-29784779	11	t	1	Cédula
117	50	Jorge	Pérez	V-10444113	5	t	2	Cédula
118	50	Sofía	Rojas	V-29145288	27	t	3	Cédula
119	50	Daniela	García	V-31319097	23	t	4	Cédula
120	51	Paola	Pérez	V-13388715	39	t	5	Cédula
121	51	Fernando	Rodríguez	V-14565127	14	t	6	Cédula
122	51	Camila	Rodríguez	V-12450359	18	t	7	Cédula
125	53	Valentina	Hernández	V-15104957	21	t	8	Cédula
126	53	Ana	Díaz	V-25023239	39	t	9	Cédula
33	14	Camila	Martínez	V-23207008	18	t	8	Cédula
34	14	Diego	Mendoza	V-5655383	31	t	9	Cédula
35	15	Daniela	García	V-19624228	36	t	10	Cédula
36	15	Ricardo	Pérez	V-25879478	11	t	11	Cédula
37	15	Camila	Pérez	V-20492029	22	t	12	Cédula
38	15	Miguel	López	V-14336742	9	t	13	Cédula
39	16	Daniela	Hernández	V-5683839	33	t	14	Cédula
40	16	Pedro	Díaz	V-28470149	40	t	15	Cédula
41	16	Gabriela	García	V-8627192	22	t	16	Cédula
42	17	Paola	Rodríguez	V-31716951	12	t	17	Cédula
43	17	Miguel	González	V-19094832	36	t	18	Cédula
44	18	Ricardo	López	V-29529169	23	t	19	Cédula
45	18	Ricardo	Hernández	V-30181805	10	t	20	Cédula
46	18	Miguel	Pérez	V-21359461	51	t	21	Cédula
47	18	Andrés	Ramírez	V-5340614	19	t	22	Cédula
48	19	Valentina	Hernández	V-18569450	40	t	23	Cédula
49	19	Sofía	López	V-30029439	23	t	24	Cédula
50	20	Pedro	Hernández	V-29783459	40	t	25	Cédula
51	20	Ana	Hernández	V-14940381	6	t	26	Cédula
52	21	Ana	González	V-24262398	66	t	27	Cédula
76	32	María	Rojas	V-18281036	56	t	1	Cédula
77	32	Isabel	García	V-31029547	36	t	2	Cédula
78	33	José	Torres	V-17242711	13	t	3	Cédula
79	33	Carlos	Ramírez	V-17276141	48	t	4	Cédula
80	34	Carlos	Hernández	V-27693658	9	t	5	Cédula
81	34	Lucía	Rodríguez	V-20260086	8	t	6	Cédula
82	34	Daniela	Díaz	V-5839687	45	t	7	Cédula
83	34	Ricardo	Mendoza	V-15139819	70	t	8	Cédula
84	35	Lucía	López	V-24707871	32	t	9	Cédula
127	54	Luis	Ramírez	V-17099854	39	t	10	Cédula
128	54	Jorge	Díaz	V-6460772	42	t	11	Cédula
129	54	Sofía	Hernández	V-29593419	4	t	12	Cédula
130	55	Gabriela	Pérez	V-7117302	46	t	13	Cédula
131	55	Miguel	García	V-22293403	25	t	14	Cédula
132	55	José	Rojas	V-16137544	36	t	15	Cédula
137	57	Carlos	Rodríguez	V-12918690	15	t	16	Cédula
138	57	Ricardo	Martínez	V-17482697	27	t	17	Cédula
160	69	Fernando	López	V-15527790	36	t	1	Cédula
161	69	Andrés	Torres	V-21246388	68	t	2	Cédula
162	69	Valentina	García	V-28652550	78	t	3	Cédula
163	69	Andrés	García	V-9089416	72	t	4	Cédula
164	70	Isabel	Hernández	V-11780277	11	t	5	Cédula
165	70	Diego	Hernández	V-13135541	3	t	6	Cédula
166	71	Camila	Rojas	V-20961831	35	t	7	Cédula
167	71	Luis	Rojas	V-24264718	59	t	8	Cédula
168	71	Gabriela	López	V-10898490	48	t	9	Cédula
169	72	Ricardo	Rojas	V-23230139	20	t	10	Cédula
170	73	María	Mendoza	V-16311607	43	t	11	Cédula
171	74	Carlos	Díaz	V-15858270	37	t	12	Cédula
172	74	Miguel	García	V-24544139	12	t	13	Cédula
173	74	Ana	Díaz	V-15294712	39	t	14	Cédula
174	74	Valentina	Martínez	V-25623407	38	t	15	Cédula
175	75	Daniela	Rojas	V-30324856	12	t	16	Cédula
176	75	Diego	Rodríguez	V-7072256	17	t	17	Cédula
177	75	Fernando	Díaz	V-8900367	25	t	18	Cédula
178	76	Valentina	Mendoza	V-5730495	9	t	19	Cédula
179	77	José	García	V-18719297	30	t	20	Cédula
180	77	Jorge	Díaz	V-17666675	9	t	21	Cédula
181	77	Sofía	Rodríguez	V-10988581	57	t	22	Cédula
182	77	María	García	V-20535832	26	t	23	Cédula
183	78	José	Rojas	V-19067380	34	t	24	Cédula
184	78	Ricardo	Torres	V-27549371	29	t	25	Cédula
185	78	Pedro	González	V-9702169	21	t	26	Cédula
186	79	Camila	García	V-14232633	45	t	27	Cédula
187	79	Camila	Ramírez	V-21630274	28	t	28	Cédula
188	79	Camila	López	V-10006912	20	t	29	Cédula
189	80	Camila	Ramírez	V-22783574	35	t	30	Cédula
190	80	Ricardo	Martínez	V-8102576	35	t	31	Cédula
64	27	Ricardo	Rodríguez	V-26733530	29	t	1	Cédula
65	27	Isabel	Díaz	V-13178252	20	t	2	Cédula
66	27	Carlos	Rodríguez	V-14269324	30	t	3	Cédula
67	28	Lucía	Díaz	V-16580437	52	t	4	Cédula
68	28	Pedro	Mendoza	V-13012984	12	t	5	Cédula
69	28	Isabel	Mendoza	V-17791994	77	t	6	Cédula
70	29	Carlos	López	V-26970815	43	t	7	Cédula
71	29	Jorge	Rojas	V-7694934	56	t	8	Cédula
72	29	José	Torres	V-7295819	74	t	9	Cédula
73	30	José	García	V-17028033	34	t	10	Cédula
74	31	Isabel	Torres	V-9802233	35	t	11	Cédula
75	31	Ricardo	García	V-27736848	19	t	12	Cédula
88	37	Gabriela	Rodríguez	V-27181413	36	t	1	Cédula
89	37	María	Pérez	V-13904256	37	t	2	Cédula
90	38	Paola	González	V-29402225	62	t	3	Cédula
91	38	Jorge	López	V-28021611	53	t	4	Cédula
92	38	Miguel	Torres	V-9977257	40	t	5	Cédula
93	38	Miguel	López	V-25045144	11	t	6	Cédula
94	39	Miguel	Díaz	V-18379164	23	t	7	Cédula
95	40	Sofía	Pérez	V-23668704	26	t	8	Cédula
96	40	Camila	Mendoza	V-6726243	22	t	9	Cédula
97	41	Ana	García	V-24263599	43	t	10	Cédula
98	41	Lucía	González	V-25434478	57	t	11	Cédula
99	42	Gabriela	Martínez	V-15456814	17	t	1	Cédula
100	43	Camila	García	V-12233294	37	t	2	Cédula
101	44	María	Hernández	V-15113955	6	t	3	Cédula
102	44	Isabel	Mendoza	V-19450384	24	t	4	Cédula
103	44	Sofía	Rodríguez	V-18323497	60	t	5	Cédula
104	44	Diego	López	V-24240100	61	t	6	Cédula
105	45	Ana	Hernández	V-19618878	32	t	7	Cédula
106	45	Daniela	Martínez	V-31142857	26	t	8	Cédula
107	46	Ana	Pérez	V-13588868	14	t	9	Cédula
108	46	Isabel	Díaz	V-30315001	41	t	10	Cédula
109	46	Paola	Martínez	V-26045923	32	t	11	Cédula
110	47	Paola	Torres	V-22014372	27	t	1	Cédula
111	48	Ana	Martínez	V-28968452	33	t	2	Cédula
112	48	Ricardo	Ramírez	V-22540513	23	t	3	Cédula
113	49	Ana	Ramírez	V-27762633	59	t	4	Cédula
114	49	Miguel	Rodríguez	V-24553493	5	t	5	Cédula
115	49	Luis	García	V-23754312	9	t	6	Cédula
139	58	Isabel	Hernández	V-9115029	75	t	1	Cédula
140	59	Gabriela	Martínez	V-22071010	43	t	2	Cédula
141	59	María	Martínez	V-23589874	43	t	3	Cédula
142	59	Luis	Rodríguez	V-15378074	58	t	4	Cédula
144	61	Fernando	Pérez	V-15204726	23	t	5	Cédula
145	61	Fernando	García	V-7646099	39	t	6	Cédula
146	62	Paola	Mendoza	V-25305092	8	t	7	Cédula
147	63	Lucía	García	V-26538834	21	t	8	Cédula
148	63	Luis	Mendoza	V-7010347	24	t	9	Cédula
149	63	Carlos	Martínez	V-29104258	24	t	10	Cédula
150	64	Ana	González	V-14737898	59	t	11	Cédula
151	65	Valentina	Díaz	V-5777667	38	t	12	Cédula
152	65	José	González	V-14440752	41	t	13	Cédula
153	65	Ana	López	V-9494110	30	t	14	Cédula
154	66	Paola	Rojas	V-25503205	37	t	15	Cédula
155	66	Sofía	Pérez	V-11679274	12	t	16	Cédula
156	67	Miguel	Torres	V-15688094	42	t	17	Cédula
157	67	Fernando	Ramírez	V-22862360	22	t	18	Cédula
158	67	Ana	López	V-24585793	38	t	19	Cédula
159	68	Carlos	Rojas	V-13126768	29	t	20	Cédula
192	82	Valentina	García	V-17067670	32	t	1	Cédula
193	82	Miguel	Hernández	V-17438793	40	t	2	Cédula
194	83	Carlos	Hernández	V-16068442	44	t	3	Cédula
195	84	Ricardo	Pérez	V-29587756	14	t	4	Cédula
196	84	Lucía	Rojas	V-6970720	44	t	5	Cédula
197	84	Camila	Pérez	V-26162835	29	t	6	Cédula
198	85	María	González	V-22858087	31	t	7	Cédula
199	85	Valentina	González	V-21851573	14	t	8	Cédula
200	85	Pedro	Torres	V-22664931	22	t	9	Cédula
201	86	José	Rodríguez	V-18598883	38	t	10	Cédula
202	86	Luis	Díaz	V-19559591	19	t	11	Cédula
203	86	Diego	Díaz	V-14096440	45	t	12	Cédula
204	86	José	Pérez	V-15552355	58	t	13	Cédula
205	87	Jorge	Mendoza	V-9695962	29	t	14	Cédula
206	87	Luis	Martínez	V-25306093	43	t	15	Cédula
207	87	Ricardo	Díaz	V-12655054	37	t	16	Cédula
208	88	Andrés	Rodríguez	V-9446197	24	t	1	Cédula
209	88	Ana	González	V-8007109	55	t	2	Cédula
210	88	María	García	V-18885161	45	t	3	Cédula
211	89	Luis	Pérez	V-19585315	22	t	4	Cédula
212	89	Daniela	Mendoza	V-25972650	17	t	5	Cédula
213	90	Miguel	López	V-26845171	22	t	6	Cédula
216	92	Isabel	Pérez	V-26251231	41	t	7	Cédula
217	92	Luis	Díaz	V-25063330	39	t	8	Cédula
218	92	Sofía	Mendoza	V-23015575	13	t	9	Cédula
219	92	Paola	González	V-23898536	9	t	10	Cédula
220	93	Ricardo	Martínez	V-18124284	72	t	11	Cédula
221	93	Isabel	Rodríguez	V-14913060	19	t	12	Cédula
222	94	Ricardo	Mendoza	V-28379495	10	t	13	Cédula
223	94	Miguel	Rojas	V-8669602	26	t	14	Cédula
224	94	Camila	Díaz	V-12779781	20	t	15	Cédula
225	95	Andrés	Mendoza	V-31709598	17	t	16	Cédula
226	95	Miguel	Hernández	V-20352844	77	t	17	Cédula
227	96	Ricardo	Torres	V-10789062	27	t	18	Cédula
228	96	Daniela	García	V-8924154	29	t	19	Cédula
229	96	Carlos	Torres	V-17875169	41	t	20	Cédula
230	97	Camila	Rojas	V-21499582	9	t	1	Cédula
231	98	Diego	Mendoza	V-30922397	26	t	2	Cédula
232	98	Lucía	Martínez	V-23187957	34	t	3	Cédula
233	99	Ricardo	Rodríguez	V-31025879	55	t	4	Cédula
234	99	Paola	Rojas	V-19366902	49	t	5	Cédula
235	100	Valentina	Torres	V-13970544	58	t	6	Cédula
236	100	Andrés	Rojas	V-9257660	42	t	7	Cédula
237	100	Jorge	Díaz	V-9770488	12	t	8	Cédula
238	101	Isabel	Martínez	V-24527187	56	t	9	Cédula
243	103	Isabel	Rodríguez	V-9452666	12	t	10	Cédula
244	103	Miguel	Rodríguez	V-19170504	34	t	11	Cédula
245	103	Ana	Rodríguez	V-15514330	37	t	12	Cédula
246	104	Sofía	Mendoza	V-12148954	5	t	13	Cédula
247	104	Ana	Pérez	V-30247886	29	t	14	Cédula
55	23	Gabriela	Ramírez	V-7518759	24	t	1	Cédula
56	24	Daniela	García	V-31435121	32	t	2	Cédula
57	25	Ricardo	Rodríguez	V-20726894	22	t	3	Cédula
58	25	Paola	González	V-19496476	68	t	4	Cédula
59	25	Diego	Torres	V-5696101	18	t	5	Cédula
60	26	Luis	Díaz	V-16675635	23	t	6	Cédula
61	26	Isabel	García	V-27232614	18	t	7	Cédula
62	26	Ana	López	V-22266984	25	t	8	Cédula
63	26	Paola	Díaz	V-25985235	54	t	9	Cédula
248	106	kevin alejandro 	mendez colmenares	27567099	30	t	10	Cédula
249	106	Kevin	Mendez	27567100	24	t	11	Cédula
1	1	Pedro	Ramírez	V-30342494	24	t	1	Cédula
2	1	Fernando	Díaz	V-9060227	36	t	2	Cédula
3	2	Miguel	Rodríguez	V-22252216	6	t	3	Cédula
4	2	Diego	Torres	V-20860207	6	t	4	Cédula
5	3	José	López	V-29434793	21	t	5	Cédula
6	3	Camila	Pérez	V-14346424	10	t	6	Cédula
7	3	Lucía	González	V-8129379	53	t	7	Cédula
8	3	José	Pérez	V-17716227	22	t	8	Cédula
11	4	Diego	Hernández	V-24425300	32	t	11	Cédula
12	4	Miguel	García	V-11853801	22	t	12	Cédula
13	5	Fernando	García	V-9444504	21	t	13	Cédula
17	7	Lucía	González	V-8753864	31	t	14	Cédula
18	7	Carlos	López	V-9276362	60	t	15	Cédula
19	7	Pedro	Rojas	V-13372828	74	t	16	Cédula
20	8	Gabriela	Mendoza	V-16146294	22	t	17	Cédula
21	8	José	Díaz	V-12463637	23	t	18	Cédula
22	9	Sofía	Rojas	V-22092818	17	t	19	Cédula
23	9	Andrés	González	V-8637385	23	t	20	Cédula
24	10	María	Ramírez	V-23067450	32	t	21	Cédula
25	11	Lucía	Pérez	V-11437085	42	t	22	Cédula
9	4	Miguel	González	V-6682497	16	t	25	Cédula
10	4	Fernando	Rodríguez	V-11235251	19	t	57	Cédula
\.


--
-- Data for Name: pagos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.pagos (id_pago, id_reserva, monto, metodo_pago, referencia, fecha_pago, is_active) FROM stdin;
1	1	410.00	Transferencia	653306	2026-03-03 00:00:00	t
2	2	820	Transferencia	170674	2026-03-08 00:00:00	t
3	3	1640	Efectivo	156802	2026-02-14 00:00:00	t
4	4	1640	Tarjeta	707314	2026-02-27 00:00:00	t
5	5	410	Tarjeta	176819	2026-03-09 00:00:00	t
6	7	615.00	Transferencia	563298	2026-03-03 00:00:00	t
7	8	410.00	Efectivo	532322	2026-02-21 00:00:00	t
8	9	820	Transferencia	910891	2026-02-13 00:00:00	t
9	10	205.00	Transferencia	843215	2026-02-15 00:00:00	t
10	11	410	Pago Móvil	521947	2026-02-19 00:00:00	t
11	12	820.00	Pago Móvil	934692	2026-03-02 00:00:00	t
12	13	410	Zelle	686075	2026-03-02 00:00:00	t
13	14	1640	Efectivo	390782	2026-03-04 00:00:00	t
14	15	820.00	Zelle	331251	2026-02-26 00:00:00	t
15	16	615.00	Tarjeta	142213	2026-03-15 00:00:00	t
16	17	820	Zelle	206851	2026-03-27 00:00:00	t
17	18	820.00	Transferencia	947458	2026-03-21 00:00:00	t
18	19	410.00	Pago Móvil	118080	2026-02-27 00:00:00	t
19	20	410.00	Transferencia	661894	2026-03-23 00:00:00	t
20	21	410	Tarjeta	768854	2026-03-29 00:00:00	t
21	23	95.00	Zelle	264686	2026-03-30 00:00:00	t
22	24	190	Zelle	576086	2026-03-28 00:00:00	t
23	25	570	Zelle	723948	2026-04-04 00:00:00	t
24	26	760	Pago Móvil	953797	2026-03-28 00:00:00	t
25	27	3750	Transferencia	982277	2026-04-04 00:00:00	t
26	28	3750	Pago Móvil	255813	2026-04-05 00:00:00	t
27	29	1875.00	Transferencia	579123	2026-05-03 00:00:00	t
28	30	1250	Efectivo	148225	2026-04-13 00:00:00	t
29	31	2500	Efectivo	749813	2026-04-30 00:00:00	t
30	32	480	Transferencia	833247	2026-05-04 00:00:00	t
31	33	480	Zelle	423939	2026-04-19 00:00:00	t
32	34	480.00	Efectivo	591081	2026-05-08 00:00:00	t
33	35	240	Transferencia	575679	2026-05-22 00:00:00	t
34	37	1780	Tarjeta	236306	2026-05-07 00:00:00	t
35	38	1780.00	Pago Móvil	573962	2026-05-16 00:00:00	t
36	39	445.00	Pago Móvil	339592	2026-05-11 00:00:00	t
37	40	1780	Transferencia	552855	2026-05-13 00:00:00	t
38	41	1780	Pago Móvil	683286	2026-05-15 00:00:00	t
39	42	160.00	Pago Móvil	575682	2026-07-01 00:00:00	t
40	43	320	Pago Móvil	736565	2026-07-02 00:00:00	t
41	44	640.00	Transferencia	728437	2026-06-01 00:00:00	t
42	45	640	Efectivo	192410	2026-05-29 00:00:00	t
43	46	480.00	Zelle	254864	2026-06-13 00:00:00	t
44	47	280.00	Zelle	996840	2026-06-28 00:00:00	t
45	48	560.00	Transferencia	164879	2026-07-04 00:00:00	t
46	49	1680	Zelle	169113	2026-06-15 00:00:00	t
47	50	960	Transferencia	410160	2026-08-05 00:00:00	t
48	51	720	Tarjeta	956572	2026-07-25 00:00:00	t
49	53	480	Zelle	543814	2026-08-08 00:00:00	t
50	54	720	Transferencia	536802	2026-07-22 00:00:00	t
51	55	360.00	Pago Móvil	829168	2026-08-09 00:00:00	t
52	57	480	Zelle	559457	2026-08-16 00:00:00	t
53	58	160.00	Pago Móvil	741599	2026-08-17 00:00:00	t
54	59	480.00	Pago Móvil	414527	2026-08-10 00:00:00	t
55	61	640	Efectivo	971776	2026-08-23 00:00:00	t
56	62	160.00	Tarjeta	261684	2026-07-31 00:00:00	t
57	63	480.00	Zelle	131757	2026-08-21 00:00:00	t
58	64	320	Transferencia	359961	2026-08-12 00:00:00	t
59	65	480.00	Tarjeta	589491	2026-08-22 00:00:00	t
60	66	640	Pago Móvil	572230	2026-08-10 00:00:00	t
61	67	960	Zelle	640546	2026-08-02 00:00:00	t
62	68	320	Zelle	749840	2026-07-28 00:00:00	t
63	69	820.00	Transferencia	440839	2026-09-25 00:00:00	t
64	70	820	Transferencia	563864	2026-09-09 00:00:00	t
65	71	1230	Transferencia	677086	2026-08-27 00:00:00	t
66	72	410	Efectivo	451317	2026-09-08 00:00:00	t
67	73	410	Zelle	853504	2026-09-05 00:00:00	t
68	74	1640	Pago Móvil	200018	2026-08-30 00:00:00	t
69	75	615.00	Pago Móvil	663628	2026-08-31 00:00:00	t
70	76	410	Pago Móvil	160541	2026-08-30 00:00:00	t
71	77	820.00	Tarjeta	172371	2026-09-06 00:00:00	t
72	78	1230	Efectivo	902674	2026-09-16 00:00:00	t
73	79	1230	Tarjeta	646571	2026-09-11 00:00:00	t
74	80	410.00	Efectivo	160423	2026-09-09 00:00:00	t
75	82	640	Pago Móvil	659572	2026-09-10 00:00:00	t
76	83	320	Pago Móvil	537862	2026-09-29 00:00:00	t
77	84	480.00	Tarjeta	772865	2026-09-30 00:00:00	t
78	85	480.00	Tarjeta	606676	2026-10-13 00:00:00	t
79	86	1280	Transferencia	817269	2026-09-14 00:00:00	t
80	87	960	Efectivo	508060	2026-10-05 00:00:00	t
81	88	2670	Tarjeta	566339	2026-10-10 00:00:00	t
82	89	1780	Transferencia	617077	2026-10-08 00:00:00	t
83	90	890	Pago Móvil	445549	2026-10-09 00:00:00	t
84	92	3560	Efectivo	172518	2026-10-21 00:00:00	t
85	93	890.00	Pago Móvil	703178	2026-09-30 00:00:00	t
86	94	1335.00	Pago Móvil	599292	2026-10-02 00:00:00	t
87	95	1780	Transferencia	325230	2026-10-04 00:00:00	t
88	96	2670	Pago Móvil	464825	2026-09-25 00:00:00	t
89	97	320	Pago Móvil	688861	2026-10-27 00:00:00	t
90	98	640	Pago Móvil	276379	2026-11-09 00:00:00	t
91	99	320.00	Pago Móvil	465509	2026-11-05 00:00:00	t
92	100	960	Transferencia	838253	2026-10-23 00:00:00	t
93	101	320	Zelle	486999	2026-11-02 00:00:00	t
94	103	960	Zelle	101139	2026-11-11 00:00:00	t
95	104	640	Zelle	272088	2026-11-23 00:00:00	t
96	106	60	Pago Móvil	02050608	2026-11-02 20:48:24.940442	t
98	108	60	Transferencia	TEST-MENOR-01	2026-11-03 01:26:40.223422	t
97	7	10.00	Zelle	TEST-QA-10-EDIT	2026-11-03 00:08:17.276262	f
99	7	10.00	Nequi	NEQUI-COL-998811	2026-11-03 07:41:32.20607	t
100	7	10.00	Bancolombia	BANCOL-TR-554433	2026-11-03 07:41:32.363178	t
101	7	595.00	Nequi	LIQ-TEST-7	2026-11-03 08:02:00.344115	t
102	44	560.00	Transferencia	LIQ-RES-44	2026-11-03 14:03:05.431274	t
\.


--
-- Data for Name: paquetes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.paquetes (id_paquete, id_destino, nombre_paquete, resumen, descripcion, incluye, no_incluye, condiciones, duracion_dias, duracion_noches, precio_paquete, is_active) FROM stdin;
2	1	Los Roques Premium 3D/2N	Disfruta Los Roques	Paquete turístico a Los Roques de 3 días.	Traslados, hospedaje y guía	Gastos personales	\N	3	2	890	t
3	2	Margarita Todo Incluido	Disfruta Margarita	Paquete turístico a Margarita de 4 días.	Traslados, hospedaje y guía	Gastos personales	\N	4	3	560	t
4	3	Mérida Aventura Andina	Disfruta Mérida	Paquete turístico a Mérida de 3 días.	Traslados, hospedaje y guía	Gastos personales	\N	3	2	410	t
5	4	Canaima Expedición Salto Ángel	Disfruta Canaima	Paquete turístico a Canaima de 4 días.	Traslados, hospedaje y guía	Gastos personales	\N	4	3	1250	t
6	5	Morrocoy Cayos Express	Disfruta Morrocoy	Paquete turístico a Morrocoy de 2 días.	Traslados, hospedaje y guía	Gastos personales	\N	2	1	240	t
7	6	Choroní Fin de Semana	Disfruta Choroní	Paquete turístico a Choroní de 2 días.	Traslados, hospedaje y guía	Gastos personales	\N	2	1	190	t
1	1	Los Roques Full Day	Disfruta Los Roques	Paquete turístico a Los Roques de 1 días.	Traslados, hospedaje y guía	Gastos personales	\N	1	0	320	t
\.


--
-- Data for Name: procesos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.procesos (id_pro, id_usu, nom_pro, fec_inicio, fec_fin, est_pro, det_pro, act_pro) FROM stdin;
2	1	Logística Viaje #2 — Mérida (Bus Cama)	2026-04-03	2026-04-06	completado	Transporte: 1 Bus Cama (27/60 asientos ocupados) · Paquete: Mérida Aventura Andina · Coordinación de embarque, hospedaje y guías.	t
3	1	Logística Viaje #3 — Choroní (Bus Cama)	2026-04-16	2026-04-18	completado	Transporte: 1 Bus Cama (11/60 asientos ocupados) · Paquete: Choroní Fin de Semana · Coordinación de embarque, hospedaje y guías.	t
4	1	Logística Viaje #4 — Canaima (Avión)	2026-05-14	2026-05-18	completado	Transporte: 1 Avión (12/150 asientos ocupados) · Paquete: Canaima Expedición Salto Ángel · Coordinación de embarque, hospedaje y guías.	t
5	1	Logística Viaje #5 — Morrocoy (Bus Cama)	2026-05-31	2026-06-02	completado	Transporte: 1 Bus Cama (9/60 asientos ocupados) · Paquete: Morrocoy Cayos Express · Coordinación de embarque, hospedaje y guías.	t
6	1	Logística Viaje #6 — Los Roques (Avión)	2026-06-17	2026-06-20	completado	Transporte: 1 Avión (11/150 asientos ocupados) · Paquete: Los Roques Premium 3D/2N · Coordinación de embarque, hospedaje y guías.	t
7	1	Logística Viaje #7 — Los Roques (Avión)	2026-07-09	2026-07-10	completado	Transporte: 1 Avión (11/150 asientos ocupados) · Paquete: Los Roques Full Day · Coordinación de embarque, hospedaje y guías.	t
8	1	Logística Viaje #8 — Margarita (Avión)	2026-07-26	2026-07-30	completado	Transporte: 1 Avión (6/150 asientos ocupados) · Paquete: Margarita Todo Incluido · Coordinación de embarque, hospedaje y guías.	t
9	1	Logística Viaje #9 — Morrocoy (Bus Cama)	2026-08-22	2026-08-24	completado	Transporte: 1 Bus Cama (17/60 asientos ocupados) · Paquete: Morrocoy Cayos Express · Coordinación de embarque, hospedaje y guías.	t
10	1	Logística Viaje #10 — Los Roques (Avión)	2026-09-05	2026-09-06	completado	Transporte: 1 Avión (20/150 asientos ocupados) · Paquete: Los Roques Full Day · Coordinación de embarque, hospedaje y guías.	t
11	1	Logística Viaje #11 — Mérida (Bus Cama)	2026-09-30	2026-10-03	completado	Transporte: 1 Bus Cama (31/60 asientos ocupados) · Paquete: Mérida Aventura Andina · Coordinación de embarque, hospedaje y guías.	t
12	1	Logística Viaje #12 — Los Roques (Avión)	2026-10-18	2026-10-19	completado	Transporte: 1 Avión (16/150 asientos ocupados) · Paquete: Los Roques Full Day · Coordinación de embarque, hospedaje y guías.	t
13	1	Logística Viaje #13 — Los Roques (Avión)	2026-11-05	2026-11-08	en ejecución	Transporte: 1 Avión (20/150 asientos ocupados) · Paquete: Los Roques Premium 3D/2N · Coordinación de embarque, hospedaje y guías.	t
14	1	Logística Viaje #14 — Los Roques (Avión)	2026-11-29	2026-11-30	en ejecución	Transporte: 1 Avión (14/150 asientos ocupados) · Paquete: Los Roques Full Day · Coordinación de embarque, hospedaje y guías.	t
1	1	Logística Viaje #1 — Mérida (Bus Cama)	2026-03-13	2026-03-16	completado	Transporte: 1 Bus Cama (22/60 asientos ocupados) · Paquete: Mérida Aventura Andina · Coordinación de embarque, hospedaje y guías.	t
\.


--
-- Data for Name: reservas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reservas (id_reserva, id_cliente, id_viaje, fecha_reserva, monto_total, estatus_pago, is_active) FROM stdin;
4	V-14407126	1	2026-02-27 00:00:00	1640	Pagado	t
5	V-23221378	1	2026-03-08 00:00:00	410	Pagado	t
8	V-28363025	1	2026-02-21 00:00:00	820	Abonado	t
9	V-29832067	1	2026-02-11 00:00:00	820	Pagado	t
10	V-14407126	1	2026-02-12 00:00:00	410	Abonado	t
11	V-25424941	1	2026-02-17 00:00:00	410	Pagado	t
12	V-21752336	2	2026-03-01 00:00:00	1640	Abonado	t
13	V-20283294	2	2026-02-28 00:00:00	410	Pagado	t
16	V-27628504	2	2026-03-15 00:00:00	1230	Abonado	t
19	V-21017815	2	2026-02-27 00:00:00	820	Abonado	t
21	V-26159462	2	2026-03-26 00:00:00	410	Pagado	t
23	V-15876168	3	2026-03-29 00:00:00	190	Abonado	t
24	V-16610689	3	2026-03-28 00:00:00	190	Pagado	t
25	V-13672605	3	2026-04-02 00:00:00	570	Pagado	t
26	V-23221378	3	2026-03-25 00:00:00	760	Pagado	t
27	V-19548773	4	2026-04-04 00:00:00	3750	Pagado	t
29	V-20283294	4	2026-05-03 00:00:00	3750	Abonado	t
30	V-16610689	4	2026-04-11 00:00:00	1250	Pagado	t
31	V-23955899	4	2026-04-29 00:00:00	2500	Pagado	t
32	V-23221378	5	2026-05-02 00:00:00	480	Pagado	t
33	V-24690420	5	2026-04-16 00:00:00	480	Pagado	t
35	V-22486857	5	2026-05-20 00:00:00	240	Pagado	t
37	V-29832067	6	2026-05-05 00:00:00	1780	Pagado	t
39	V-14407126	6	2026-05-08 00:00:00	890	Abonado	t
40	V-29097546	6	2026-05-13 00:00:00	1780	Pagado	t
41	V-12203563	6	2026-05-13 00:00:00	1780	Pagado	t
42	V-14407126	7	2026-06-29 00:00:00	320	Abonado	t
43	V-25424941	7	2026-06-29 00:00:00	320	Pagado	t
45	V-26159462	7	2026-05-26 00:00:00	640	Pagado	t
46	V-29097546	7	2026-06-12 00:00:00	960	Abonado	t
47	V-11469042	8	2026-06-28 00:00:00	560	Abonado	t
48	V-21752336	8	2026-07-01 00:00:00	1120	Abonado	t
51	V-19548773	9	2026-07-24 00:00:00	720	Pagado	t
53	V-26893983	9	2026-08-08 00:00:00	480	Pagado	t
55	V-25424941	9	2026-08-06 00:00:00	720	Abonado	t
57	V-23955899	9	2026-08-16 00:00:00	480	Pagado	t
58	V-26159462	10	2026-08-15 00:00:00	320	Abonado	t
59	V-22486857	10	2026-08-09 00:00:00	960	Abonado	t
61	V-31301109	10	2026-08-23 00:00:00	640	Pagado	t
63	V-19548773	10	2026-08-18 00:00:00	960	Abonado	t
64	V-12203563	10	2026-08-11 00:00:00	320	Pagado	t
65	V-21017815	10	2026-08-19 00:00:00	960	Abonado	t
67	V-12938084	10	2026-08-01 00:00:00	960	Pagado	t
68	V-21752336	10	2026-07-25 00:00:00	320	Pagado	t
69	V-21752336	11	2026-09-22 00:00:00	1640	Abonado	t
71	V-27628504	11	2026-08-26 00:00:00	1230	Pagado	t
72	V-12203563	11	2026-09-06 00:00:00	410	Pagado	t
73	V-20283294	11	2026-09-04 00:00:00	410	Pagado	t
78	V-31301109	11	2026-09-16 00:00:00	1230	Pagado	t
79	V-12938084	11	2026-09-10 00:00:00	1230	Pagado	t
80	V-12938084	11	2026-09-06 00:00:00	820	Abonado	t
82	V-16610689	12	2026-09-08 00:00:00	640	Pagado	t
83	V-23221378	12	2026-09-27 00:00:00	320	Pagado	t
84	V-21017815	12	2026-09-27 00:00:00	960	Abonado	t
85	V-25424941	12	2026-10-10 00:00:00	960	Abonado	t
86	V-26159462	12	2026-09-14 00:00:00	1280	Pagado	t
87	V-23221378	12	2026-10-03 00:00:00	960	Pagado	t
88	V-10000000	13	2026-10-08 00:00:00	2670	Pagado	t
89	V-15876168	13	2026-10-07 00:00:00	1780	Pagado	t
90	V-23955899	13	2026-10-06 00:00:00	890	Pagado	t
93	V-22486857	13	2026-09-29 00:00:00	1780	Abonado	t
95	V-18814252	13	2026-10-03 00:00:00	1780	Pagado	t
96	V-18814252	13	2026-09-23 00:00:00	2670	Pagado	t
98	V-15141647	14	2026-11-06 00:00:00	640	Pagado	t
99	V-10734521	14	2026-11-05 00:00:00	640	Abonado	t
101	V-15876168	14	2026-10-30 00:00:00	320	Pagado	t
106	27567099	3	2026-11-02 20:48:24.823726	380.00	Abonado	t
3	V-20283294	1	2026-02-14 00:00:00	1537.50	Pagado	t
1	V-22486857	1	2026-02-28 00:00:00	820.00	Abonado	t
107	PAS-998877	13	2026-11-03 01:26:18.892045	1557.50	Abonado	t
14	V-15141647	2	2026-03-01 00:00:00	1537.50	Pagado	t
15	V-22486857	2	2026-02-23 00:00:00	1435.00	Abonado	t
17	V-29097546	2	2026-03-25 00:00:00	717.50	Pagado	t
18	V-24690420	2	2026-03-18 00:00:00	1537.50	Abonado	t
20	V-17345210	2	2026-03-22 00:00:00	717.50	Abonado	t
28	V-25424941	4	2026-04-02 00:00:00	3437.50	Pagado	t
34	V-17345210	5	2026-05-08 00:00:00	840.00	Abonado	t
38	V-21752336	6	2026-05-15 00:00:00	3337.50	Abonado	t
49	V-24690420	8	2026-06-13 00:00:00	1400.00	Pagado	t
50	V-12938084	9	2026-08-05 00:00:00	840.00	Pagado	t
54	V-18079731	9	2026-07-21 00:00:00	660.00	Pagado	t
62	V-23221378	10	2026-07-30 00:00:00	240.00	Abonado	t
66	V-11469042	10	2026-08-08 00:00:00	560.00	Pagado	t
70	V-26159462	11	2026-09-07 00:00:00	615.00	Pagado	t
74	V-11469042	11	2026-08-29 00:00:00	1537.50	Pagado	t
75	V-31301109	11	2026-08-30 00:00:00	1127.50	Abonado	t
76	V-19548773	11	2026-08-27 00:00:00	307.50	Pagado	t
77	V-22486857	11	2026-09-03 00:00:00	1537.50	Abonado	t
92	V-16610689	13	2026-10-18 00:00:00	3337.50	Pagado	t
94	V-21752336	13	2026-10-02 00:00:00	2447.50	Abonado	t
97	V-29097546	14	2026-10-24 00:00:00	240.00	Pagado	t
100	V-22486857	14	2026-10-21 00:00:00	880.00	Pagado	t
103	V-11469042	14	2026-11-10 00:00:00	880.00	Pagado	t
104	V-10000000	14	2026-11-20 00:00:00	560.00	Pagado	t
2	V-24690420	1	2026-03-08 00:00:00	615.00	Pagado	t
108	PAS-998877	13	2026-11-03 01:26:40.210169	1557.50	Abonado	t
7	V-15876168	1	2026-02-28 00:00:00	1230	Pagado	t
44	V-10734521	7	2026-06-01 00:00:00	1200.00	Pagado	t
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usuarios (id_usuario, nombre, correo_electronico, contrasena, rol, estatus, fecha_creacion, is_active) FROM stdin;
1	Administrador Principal	admin@viajesnena.com	$2b$12$85dLqsRpuomSBvclXdPJQuUMZcOejKuoZRcTHlWZ1dzuAGf7fMtUC	Admin	Activo	2026-11-02 19:16:47.804981	t
2	Coordinador de Operaciones	operador@viajesnena.com	$2b$12$CQOnh4BLVstbVD3kVCQfHexekw9wftmi6FxyRrLLLq3BS0VEwKA0q	Operador	Activo	2026-11-03 13:18:11.668565	t
3	Asesor Comercial	vendedor@viajesnena.com	$2b$12$ktnD8h4RkHeNohO6KlRD2.m7MPpV4R6suPaW8tXb5ev/1qkWWR78O	Vendedor	Activo	2026-11-03 13:18:11.919828	t
\.


--
-- Data for Name: viajes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.viajes (id_viaje, id_destino, id_paquete, fecha_salida, fecha_retorno, cupos_disponibles, estatus, is_active, metodo_transporte, cantidad_unidades) FROM stdin;
2	3	4	2026-04-03	2026-04-06	33	Finalizado	t	Bus Cama	1
5	5	6	2026-05-31	2026-06-02	51	Finalizado	t	Bus Cama	1
9	5	6	2026-08-22	2026-08-24	43	Finalizado	t	Bus Cama	1
11	3	4	2026-09-30	2026-10-03	29	Finalizado	t	Bus Cama	1
4	4	5	2026-05-14	2026-05-18	138	Finalizado	t	Avión	1
6	1	2	2026-06-17	2026-06-20	139	Finalizado	t	Avión	1
7	1	1	2026-07-09	2026-07-10	139	Finalizado	t	Avión	1
8	2	3	2026-07-26	2026-07-30	144	Finalizado	t	Avión	1
10	1	1	2026-09-05	2026-09-06	130	Finalizado	t	Avión	1
12	1	1	2026-10-18	2026-10-19	134	Finalizado	t	Avión	1
14	1	1	2026-11-29	2026-11-30	136	Programado	t	Avión	1
3	6	7	2026-04-16	2026-04-18	49	Finalizado	t	Bus Cama	1
1	3	4	2026-03-13	2026-03-16	38	Finalizado	t	Bus Cama	1
13	1	2	2026-11-05	2026-11-08	128	Programado	t	Avión	1
\.


--
-- Name: auditoria_id_auditoria_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auditoria_id_auditoria_seq', 35, true);


--
-- Name: costos_viaje_id_costo_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.costos_viaje_id_costo_seq', 42, true);


--
-- Name: destinos_id_destino_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.destinos_id_destino_seq', 7, true);


--
-- Name: ganancias_id_ganancia_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ganancias_id_ganancia_seq', 12, true);


--
-- Name: inconvenientes_id_inconveniente_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inconvenientes_id_inconveniente_seq', 4, true);


--
-- Name: integrantes_id_integrante_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.integrantes_id_integrante_seq', 251, true);


--
-- Name: pagos_id_pago_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.pagos_id_pago_seq', 102, true);


--
-- Name: paquetes_id_paquete_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.paquetes_id_paquete_seq', 7, true);


--
-- Name: procesos_id_pro_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.procesos_id_pro_seq', 14, true);


--
-- Name: reservas_id_reserva_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reservas_id_reserva_seq', 108, true);


--
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.usuarios_id_usuario_seq', 3, true);


--
-- Name: viajes_id_viaje_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.viajes_id_viaje_seq', 14, true);


--
-- Name: auditoria auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditoria
    ADD CONSTRAINT auditoria_pkey PRIMARY KEY (id_auditoria);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id_cliente);


--
-- Name: costos_viaje costos_viaje_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.costos_viaje
    ADD CONSTRAINT costos_viaje_pkey PRIMARY KEY (id_costo);


--
-- Name: destinos destinos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.destinos
    ADD CONSTRAINT destinos_pkey PRIMARY KEY (id_destino);


--
-- Name: ganancias ganancias_id_viaje_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ganancias
    ADD CONSTRAINT ganancias_id_viaje_key UNIQUE (id_viaje);


--
-- Name: ganancias ganancias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ganancias
    ADD CONSTRAINT ganancias_pkey PRIMARY KEY (id_ganancia);


--
-- Name: inconvenientes inconvenientes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inconvenientes
    ADD CONSTRAINT inconvenientes_pkey PRIMARY KEY (id_inconveniente);


--
-- Name: integrantes integrantes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integrantes
    ADD CONSTRAINT integrantes_pkey PRIMARY KEY (id_integrante);


--
-- Name: pagos pagos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_pkey PRIMARY KEY (id_pago);


--
-- Name: paquetes paquetes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paquetes
    ADD CONSTRAINT paquetes_pkey PRIMARY KEY (id_paquete);


--
-- Name: procesos procesos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.procesos
    ADD CONSTRAINT procesos_pkey PRIMARY KEY (id_pro);


--
-- Name: reservas reservas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservas
    ADD CONSTRAINT reservas_pkey PRIMARY KEY (id_reserva);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario);


--
-- Name: viajes viajes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.viajes
    ADD CONSTRAINT viajes_pkey PRIMARY KEY (id_viaje);


--
-- Name: uq_clientes_correo; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_clientes_correo ON public.clientes USING btree (lower((correo_electronico)::text));


--
-- Name: uq_clientes_telefono; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_clientes_telefono ON public.clientes USING btree (telefono);


--
-- Name: auditoria auditoria_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditoria
    ADD CONSTRAINT auditoria_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario);


--
-- Name: costos_viaje costos_viaje_id_viaje_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.costos_viaje
    ADD CONSTRAINT costos_viaje_id_viaje_fkey FOREIGN KEY (id_viaje) REFERENCES public.viajes(id_viaje);


--
-- Name: ganancias ganancias_id_viaje_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ganancias
    ADD CONSTRAINT ganancias_id_viaje_fkey FOREIGN KEY (id_viaje) REFERENCES public.viajes(id_viaje);


--
-- Name: inconvenientes inconvenientes_id_viaje_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inconvenientes
    ADD CONSTRAINT inconvenientes_id_viaje_fkey FOREIGN KEY (id_viaje) REFERENCES public.viajes(id_viaje);


--
-- Name: integrantes integrantes_id_reserva_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integrantes
    ADD CONSTRAINT integrantes_id_reserva_fkey FOREIGN KEY (id_reserva) REFERENCES public.reservas(id_reserva);


--
-- Name: pagos pagos_id_reserva_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_id_reserva_fkey FOREIGN KEY (id_reserva) REFERENCES public.reservas(id_reserva);


--
-- Name: paquetes paquetes_id_destino_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paquetes
    ADD CONSTRAINT paquetes_id_destino_fkey FOREIGN KEY (id_destino) REFERENCES public.destinos(id_destino);


--
-- Name: procesos procesos_id_usu_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.procesos
    ADD CONSTRAINT procesos_id_usu_fkey FOREIGN KEY (id_usu) REFERENCES public.usuarios(id_usuario);


--
-- Name: reservas reservas_id_cliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservas
    ADD CONSTRAINT reservas_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.clientes(id_cliente);


--
-- Name: reservas reservas_id_viaje_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reservas
    ADD CONSTRAINT reservas_id_viaje_fkey FOREIGN KEY (id_viaje) REFERENCES public.viajes(id_viaje);


--
-- Name: viajes viajes_id_destino_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.viajes
    ADD CONSTRAINT viajes_id_destino_fkey FOREIGN KEY (id_destino) REFERENCES public.destinos(id_destino);


--
-- Name: viajes viajes_id_paquete_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.viajes
    ADD CONSTRAINT viajes_id_paquete_fkey FOREIGN KEY (id_paquete) REFERENCES public.paquetes(id_paquete);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

