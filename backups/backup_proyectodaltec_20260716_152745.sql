-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: localhost    Database: proyectodaltec
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `acciones_accion`
--

DROP TABLE IF EXISTS `acciones_accion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `acciones_accion` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tipo` varchar(25) NOT NULL,
  `estado` varchar(20) NOT NULL,
  `descripcion` longtext NOT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `hallazgo_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_accion_por_hallazgo_tipo` (`hallazgo_id`,`tipo`),
  CONSTRAINT `acciones_accion_hallazgo_id_df08e2e3_fk_hallazgos_hallazgo_id` FOREIGN KEY (`hallazgo_id`) REFERENCES `hallazgos_hallazgo` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `acciones_accion`
--

LOCK TABLES `acciones_accion` WRITE;
/*!40000 ALTER TABLE `acciones_accion` DISABLE KEYS */;
INSERT INTO `acciones_accion` VALUES (1,'INMEDIATA','CERRADA','hellow','2026-07-09','2026-07-25',1),(2,'CORRECTIVA','CERRADA','dasdasdasd','2026-07-22','2026-07-31',1),(3,'VERIFICACION_EFICACIA','CERRADA','dasdasd','2026-09-18','2026-11-21',1),(4,'INMEDIATA','PENDIENTE','',NULL,NULL,2),(5,'CORRECTIVA','CERRADA','das','2026-07-12','2026-07-26',2),(6,'VERIFICACION_EFICACIA','PENDIENTE','',NULL,NULL,2),(7,'INMEDIATA','PENDIENTE','',NULL,NULL,3),(8,'CORRECTIVA','PENDIENTE','',NULL,NULL,3),(9,'VERIFICACION_EFICACIA','PENDIENTE','',NULL,NULL,3),(13,'INMEDIATA','PENDIENTE','',NULL,NULL,5),(14,'CORRECTIVA','PENDIENTE','',NULL,NULL,5),(15,'VERIFICACION_EFICACIA','PENDIENTE','',NULL,NULL,5),(16,'INMEDIATA','PENDIENTE','',NULL,NULL,6),(17,'CORRECTIVA','PENDIENTE','',NULL,NULL,6),(18,'VERIFICACION_EFICACIA','PENDIENTE','',NULL,NULL,6),(19,'INMEDIATA','PENDIENTE','',NULL,NULL,7),(20,'CORRECTIVA','PENDIENTE','',NULL,NULL,7),(21,'VERIFICACION_EFICACIA','PENDIENTE','',NULL,NULL,7);
/*!40000 ALTER TABLE `acciones_accion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `acciones_accion_archivos`
--

DROP TABLE IF EXISTS `acciones_accion_archivos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `acciones_accion_archivos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `accion_id` bigint NOT NULL,
  `archivo_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `acciones_accion_archivos_accion_id_archivo_id_3f972826_uniq` (`accion_id`,`archivo_id`),
  KEY `acciones_accion_arch_archivo_id_6abe8567_fk_archivos_` (`archivo_id`),
  CONSTRAINT `acciones_accion_arch_accion_id_39731ae7_fk_acciones_` FOREIGN KEY (`accion_id`) REFERENCES `acciones_accion` (`id`),
  CONSTRAINT `acciones_accion_arch_archivo_id_6abe8567_fk_archivos_` FOREIGN KEY (`archivo_id`) REFERENCES `archivos_archivo` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `acciones_accion_archivos`
--

LOCK TABLES `acciones_accion_archivos` WRITE;
/*!40000 ALTER TABLE `acciones_accion_archivos` DISABLE KEYS */;
/*!40000 ALTER TABLE `acciones_accion_archivos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `acciones_solicitudcierreaccion`
--

DROP TABLE IF EXISTS `acciones_solicitudcierreaccion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `acciones_solicitudcierreaccion` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `fecha_solicitud` datetime(6) NOT NULL,
  `fecha_resolucion` datetime(6) DEFAULT NULL,
  `observacion` longtext NOT NULL,
  `estado` varchar(20) NOT NULL,
  `accion_id` bigint NOT NULL,
  `administrador_id` bigint DEFAULT NULL,
  `solicitante_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `acciones_solicitudci_accion_id_0fa79112_fk_acciones_` (`accion_id`),
  KEY `acciones_solicitudci_administrador_id_62e83e99_fk_users_cus` (`administrador_id`),
  KEY `acciones_solicitudci_solicitante_id_e51bbc7f_fk_users_cus` (`solicitante_id`),
  CONSTRAINT `acciones_solicitudci_accion_id_0fa79112_fk_acciones_` FOREIGN KEY (`accion_id`) REFERENCES `acciones_accion` (`id`),
  CONSTRAINT `acciones_solicitudci_administrador_id_62e83e99_fk_users_cus` FOREIGN KEY (`administrador_id`) REFERENCES `users_customuser` (`id`),
  CONSTRAINT `acciones_solicitudci_solicitante_id_e51bbc7f_fk_users_cus` FOREIGN KEY (`solicitante_id`) REFERENCES `users_customuser` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `acciones_solicitudcierreaccion`
--

LOCK TABLES `acciones_solicitudcierreaccion` WRITE;
/*!40000 ALTER TABLE `acciones_solicitudcierreaccion` DISABLE KEYS */;
INSERT INTO `acciones_solicitudcierreaccion` VALUES (1,'2026-07-08 19:18:27.564316','2026-07-08 19:19:01.517312','sas','APROBADA',1,1,2),(2,'2026-07-14 19:54:03.551459','2026-07-14 19:54:27.932506','}','APROBADA',5,1,1),(3,'2026-07-16 16:59:40.633623','2026-07-16 17:00:31.499400','dsad','APROBADA',2,1,1),(4,'2026-07-16 17:00:13.309539','2026-07-16 17:00:27.659721','','APROBADA',3,1,1);
/*!40000 ALTER TABLE `acciones_solicitudcierreaccion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `analisis_cinco_porques_analisiscincoporques`
--

DROP TABLE IF EXISTS `analisis_cinco_porques_analisiscincoporques`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `analisis_cinco_porques_analisiscincoporques` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `autor_tipo` varchar(20) NOT NULL,
  `texto_causa` longtext NOT NULL,
  `estado` varchar(20) NOT NULL,
  `observacion_rechazo` longtext NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `aprobado_por_id` bigint DEFAULT NULL,
  `autor_id` bigint DEFAULT NULL,
  `hallazgo_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `analisis_cinco_porqu_aprobado_por_id_5fdc876b_fk_users_cus` (`aprobado_por_id`),
  KEY `analisis_cinco_porqu_autor_id_107df2ad_fk_users_cus` (`autor_id`),
  KEY `analisis_cinco_porques_analisiscincoporques_estado_5169fa97` (`estado`),
  KEY `analisis_ci_hallazg_370118_idx` (`hallazgo_id`,`estado`),
  KEY `analisis_ci_estado_1b79f1_idx` (`estado`),
  CONSTRAINT `analisis_cinco_porqu_aprobado_por_id_5fdc876b_fk_users_cus` FOREIGN KEY (`aprobado_por_id`) REFERENCES `users_customuser` (`id`),
  CONSTRAINT `analisis_cinco_porqu_autor_id_107df2ad_fk_users_cus` FOREIGN KEY (`autor_id`) REFERENCES `users_customuser` (`id`),
  CONSTRAINT `analisis_cinco_porqu_hallazgo_id_c2818f3a_fk_hallazgos` FOREIGN KEY (`hallazgo_id`) REFERENCES `hallazgos_hallazgo` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `analisis_cinco_porques_analisiscincoporques`
--

LOCK TABLES `analisis_cinco_porques_analisiscincoporques` WRITE;
/*!40000 ALTER TABLE `analisis_cinco_porques_analisiscincoporques` DISABLE KEYS */;
INSERT INTO `analisis_cinco_porques_analisiscincoporques` VALUES (1,'responsable','Porque si','aprobado','','2026-07-08 17:56:29.319017','2026-07-08 18:02:16.682220',1,2,1),(2,'admin','las','aprobado','','2026-07-08 18:14:42.757475','2026-07-08 18:14:42.757498',1,1,1),(3,'admin','dasdasda','aprobado','','2026-07-16 18:03:22.601782','2026-07-16 18:03:22.601809',1,1,3),(4,'responsable','dsadas','aprobado','','2026-07-16 18:05:26.048631','2026-07-16 18:05:56.918003',1,2,7),(5,'responsable','dasdas','rechazado','porqr','2026-07-16 18:05:31.156346','2026-07-16 18:05:52.550557',1,2,7),(6,'responsable','dsda','aprobado','','2026-07-16 18:05:34.808438','2026-07-16 18:05:46.274236',1,2,7),(7,'responsable','fddsafds','rechazado','fafa','2026-07-16 18:12:29.579108','2026-07-16 18:13:14.521583',1,2,7),(8,'responsable','dsadsa','aprobado','','2026-07-16 18:12:33.672021','2026-07-16 18:12:59.292672',1,2,7),(9,'responsable','dsadas','aprobado','','2026-07-16 18:12:39.037082','2026-07-16 18:12:56.731808',1,2,7),(10,'responsable','dsadas','aprobado','','2026-07-16 18:12:42.131009','2026-07-16 18:12:54.197249',1,2,7);
/*!40000 ALTER TABLE `analisis_cinco_porques_analisiscincoporques` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `archivos_archivo`
--

DROP TABLE IF EXISTS `archivos_archivo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `archivos_archivo` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `ruta` varchar(100) NOT NULL,
  `tipo_mime` varchar(100) NOT NULL,
  `tamanio` bigint unsigned NOT NULL,
  `fecha_carga` datetime(6) NOT NULL,
  `cargado_por_id` bigint NOT NULL,
  `hallazgo_id` bigint DEFAULT NULL,
  `mensaje_id` bigint DEFAULT NULL,
  `porque_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `archivos_archivo_cargado_por_id_36c29b34_fk_users_customuser_id` (`cargado_por_id`),
  KEY `archivos_ar_hallazg_6dcda1_idx` (`hallazgo_id`),
  KEY `archivos_ar_porque__b88151_idx` (`porque_id`),
  KEY `archivos_ar_mensaje_406bbf_idx` (`mensaje_id`),
  CONSTRAINT `archivos_archivo_cargado_por_id_36c29b34_fk_users_customuser_id` FOREIGN KEY (`cargado_por_id`) REFERENCES `users_customuser` (`id`),
  CONSTRAINT `archivos_archivo_hallazgo_id_f1a5822c_fk_hallazgos_hallazgo_id` FOREIGN KEY (`hallazgo_id`) REFERENCES `hallazgos_hallazgo` (`id`),
  CONSTRAINT `archivos_archivo_mensaje_id_bd9b23f2_fk_chat_mensaje_id` FOREIGN KEY (`mensaje_id`) REFERENCES `chat_mensaje` (`id`),
  CONSTRAINT `archivos_archivo_porque_id_371932aa_fk_analisis_` FOREIGN KEY (`porque_id`) REFERENCES `analisis_cinco_porques_analisiscincoporques` (`id`),
  CONSTRAINT `archivos_archivo_chk_1` CHECK ((`tamanio` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `archivos_archivo`
--

LOCK TABLES `archivos_archivo` WRITE;
/*!40000 ALTER TABLE `archivos_archivo` DISABLE KEYS */;
INSERT INTO `archivos_archivo` VALUES (2,'campana.png','archivos/1/campana.png','image/png',9953,'2026-07-14 18:15:49.251478',1,NULL,4,NULL),(4,'campana.png','archivos/1/campana_eTRa3Z1.png','image/png',9953,'2026-07-16 17:15:00.143912',1,6,NULL,NULL),(5,'campana.png','archivos/2/campana.png','image/png',9953,'2026-07-16 17:17:27.680429',2,NULL,5,NULL);
/*!40000 ALTER TABLE `archivos_archivo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_group`
--

DROP TABLE IF EXISTS `auth_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_group` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_group`
--

LOCK TABLES `auth_group` WRITE;
/*!40000 ALTER TABLE `auth_group` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_group` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_group_permissions`
--

DROP TABLE IF EXISTS `auth_group_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_group_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_group_permissions_group_id_permission_id_0cd325b0_uniq` (`group_id`,`permission_id`),
  KEY `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` (`permission_id`),
  CONSTRAINT `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `auth_group_permissions_group_id_b120cbf9_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_group_permissions`
--

LOCK TABLES `auth_group_permissions` WRITE;
/*!40000 ALTER TABLE `auth_group_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_group_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_permission`
--

DROP TABLE IF EXISTS `auth_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_permission` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `content_type_id` int NOT NULL,
  `codename` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_permission_content_type_id_codename_01ab375a_uniq` (`content_type_id`,`codename`),
  CONSTRAINT `auth_permission_content_type_id_2f476e4b_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=105 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_permission`
--

LOCK TABLES `auth_permission` WRITE;
/*!40000 ALTER TABLE `auth_permission` DISABLE KEYS */;
INSERT INTO `auth_permission` VALUES (1,'Can add log entry',1,'add_logentry'),(2,'Can change log entry',1,'change_logentry'),(3,'Can delete log entry',1,'delete_logentry'),(4,'Can view log entry',1,'view_logentry'),(5,'Can add permission',2,'add_permission'),(6,'Can change permission',2,'change_permission'),(7,'Can delete permission',2,'delete_permission'),(8,'Can view permission',2,'view_permission'),(9,'Can add group',3,'add_group'),(10,'Can change group',3,'change_group'),(11,'Can delete group',3,'delete_group'),(12,'Can view group',3,'view_group'),(13,'Can add content type',4,'add_contenttype'),(14,'Can change content type',4,'change_contenttype'),(15,'Can delete content type',4,'delete_contenttype'),(16,'Can view content type',4,'view_contenttype'),(17,'Can add session',5,'add_session'),(18,'Can change session',5,'change_session'),(19,'Can delete session',5,'delete_session'),(20,'Can view session',5,'view_session'),(21,'Can add blacklisted token',6,'add_blacklistedtoken'),(22,'Can change blacklisted token',6,'change_blacklistedtoken'),(23,'Can delete blacklisted token',6,'delete_blacklistedtoken'),(24,'Can view blacklisted token',6,'view_blacklistedtoken'),(25,'Can add outstanding token',7,'add_outstandingtoken'),(26,'Can change outstanding token',7,'change_outstandingtoken'),(27,'Can delete outstanding token',7,'delete_outstandingtoken'),(28,'Can view outstanding token',7,'view_outstandingtoken'),(29,'Can add Usuario',8,'add_customuser'),(30,'Can change Usuario',8,'change_customuser'),(31,'Can delete Usuario',8,'delete_customuser'),(32,'Can view Usuario',8,'view_customuser'),(33,'Can add Perfil de Empleado',9,'add_empleadoprofile'),(34,'Can change Perfil de Empleado',9,'change_empleadoprofile'),(35,'Can delete Perfil de Empleado',9,'delete_empleadoprofile'),(36,'Can view Perfil de Empleado',9,'view_empleadoprofile'),(37,'Can add Perfil de Cliente',10,'add_clienteprofile'),(38,'Can change Perfil de Cliente',10,'change_clienteprofile'),(39,'Can delete Perfil de Cliente',10,'delete_clienteprofile'),(40,'Can view Perfil de Cliente',10,'view_clienteprofile'),(41,'Can add Hallazgo',11,'add_hallazgo'),(42,'Can change Hallazgo',11,'change_hallazgo'),(43,'Can delete Hallazgo',11,'delete_hallazgo'),(44,'Can view Hallazgo',11,'view_hallazgo'),(45,'Can add Responsable del Hallazgo',12,'add_hallazgoresponsable'),(46,'Can change Responsable del Hallazgo',12,'change_hallazgoresponsable'),(47,'Can delete Responsable del Hallazgo',12,'delete_hallazgoresponsable'),(48,'Can view Responsable del Hallazgo',12,'view_hallazgoresponsable'),(49,'Can add Accion',13,'add_accion'),(50,'Can change Accion',13,'change_accion'),(51,'Can delete Accion',13,'delete_accion'),(52,'Can view Accion',13,'view_accion'),(53,'Can add Solicitud de Cierre de Accion',14,'add_solicitudcierreaccion'),(54,'Can change Solicitud de Cierre de Accion',14,'change_solicitudcierreaccion'),(55,'Can delete Solicitud de Cierre de Accion',14,'delete_solicitudcierreaccion'),(56,'Can view Solicitud de Cierre de Accion',14,'view_solicitudcierreaccion'),(57,'Can add Chat',15,'add_chat'),(58,'Can change Chat',15,'change_chat'),(59,'Can delete Chat',15,'delete_chat'),(60,'Can view Chat',15,'view_chat'),(61,'Can add Mensaje',16,'add_mensaje'),(62,'Can change Mensaje',16,'change_mensaje'),(63,'Can delete Mensaje',16,'delete_mensaje'),(64,'Can view Mensaje',16,'view_mensaje'),(65,'Can add Archivo',17,'add_archivo'),(66,'Can change Archivo',17,'change_archivo'),(67,'Can delete Archivo',17,'delete_archivo'),(68,'Can view Archivo',17,'view_archivo'),(69,'Can add Notificacion',18,'add_notificacion'),(70,'Can change Notificacion',18,'change_notificacion'),(71,'Can delete Notificacion',18,'delete_notificacion'),(72,'Can view Notificacion',18,'view_notificacion'),(73,'Can add Sector Catalog',19,'add_sectorcatalog'),(74,'Can change Sector Catalog',19,'change_sectorcatalog'),(75,'Can delete Sector Catalog',19,'delete_sectorcatalog'),(76,'Can view Sector Catalog',19,'view_sectorcatalog'),(77,'Can add Type Catalog',20,'add_tipocatalog'),(78,'Can change Type Catalog',20,'change_tipocatalog'),(79,'Can delete Type Catalog',20,'delete_tipocatalog'),(80,'Can view Type Catalog',20,'view_tipocatalog'),(81,'Can add Subsection Catalog',21,'add_subsectioncatalog'),(82,'Can change Subsection Catalog',21,'change_subsectioncatalog'),(83,'Can delete Subsection Catalog',21,'delete_subsectioncatalog'),(84,'Can view Subsection Catalog',21,'view_subsectioncatalog'),(85,'Can add External Contact',22,'add_contactoexterno'),(86,'Can change External Contact',22,'change_contactoexterno'),(87,'Can delete External Contact',22,'delete_contactoexterno'),(88,'Can view External Contact',22,'view_contactoexterno'),(89,'Can add 5-Why Analysis',23,'add_analisiscincoporques'),(90,'Can change 5-Why Analysis',23,'change_analisiscincoporques'),(91,'Can delete 5-Why Analysis',23,'delete_analisiscincoporques'),(92,'Can view 5-Why Analysis',23,'view_analisiscincoporques'),(93,'Can add Responsibility Change Request',24,'add_solicitudcambioresponsable'),(94,'Can change Responsibility Change Request',24,'change_solicitudcambioresponsable'),(95,'Can delete Responsibility Change Request',24,'delete_solicitudcambioresponsable'),(96,'Can view Responsibility Change Request',24,'view_solicitudcambioresponsable'),(97,'Can add Hist??rico de Responsable',25,'add_hallazgoresponsablehistorial'),(98,'Can change Hist??rico de Responsable',25,'change_hallazgoresponsablehistorial'),(99,'Can delete Hist??rico de Responsable',25,'delete_hallazgoresponsablehistorial'),(100,'Can view Hist??rico de Responsable',25,'view_hallazgoresponsablehistorial'),(101,'Can add Reporte de Hallazgos',26,'add_reportehallazgos'),(102,'Can change Reporte de Hallazgos',26,'change_reportehallazgos'),(103,'Can delete Reporte de Hallazgos',26,'delete_reportehallazgos'),(104,'Can view Reporte de Hallazgos',26,'view_reportehallazgos');
/*!40000 ALTER TABLE `auth_permission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `catalogos_sectorcatalog`
--

DROP TABLE IF EXISTS `catalogos_sectorcatalog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `catalogos_sectorcatalog` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` longtext NOT NULL,
  `activo` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `catalogos_s_codigo_4c0972_idx` (`codigo`,`activo`),
  KEY `catalogos_s_activo_902abf_idx` (`activo`),
  KEY `catalogos_sectorcatalog_activo_e6d4708d` (`activo`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `catalogos_sectorcatalog`
--

LOCK TABLES `catalogos_sectorcatalog` WRITE;
/*!40000 ALTER TABLE `catalogos_sectorcatalog` DISABLE KEYS */;
INSERT INTO `catalogos_sectorcatalog` VALUES (1,'RECLAMO_CLIENTE','Reclamo Cliente','Hallazgos originados por reclamos de clientes',1,'2026-07-08 17:46:51.413602','2026-07-16 18:19:56.054247'),(2,'PROVEEDOR','Proveedor','Hallazgos relacionados con proveedores',1,'2026-07-08 17:46:51.416375','2026-07-16 18:19:56.057304'),(3,'INTERNO','Interno','Hallazgos internos de la organizaci??n',1,'2026-07-08 17:46:51.418863','2026-07-16 18:19:56.059666');
/*!40000 ALTER TABLE `catalogos_sectorcatalog` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `catalogos_subsectioncatalog`
--

DROP TABLE IF EXISTS `catalogos_subsectioncatalog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `catalogos_subsectioncatalog` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `sector_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `catalogos_subsectioncatalog_sector_id_codigo_6e732f79_uniq` (`sector_id`,`codigo`),
  KEY `catalogos_s_sector__91f9ca_idx` (`sector_id`,`codigo`),
  KEY `catalogos_s_activo_026a27_idx` (`activo`),
  KEY `catalogos_subsectioncatalog_codigo_15246b29` (`codigo`),
  KEY `catalogos_subsectioncatalog_activo_83c4d7dc` (`activo`),
  CONSTRAINT `catalogos_subsection_sector_id_ca4c8dd1_fk_catalogos` FOREIGN KEY (`sector_id`) REFERENCES `catalogos_sectorcatalog` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `catalogos_subsectioncatalog`
--

LOCK TABLES `catalogos_subsectioncatalog` WRITE;
/*!40000 ALTER TABLE `catalogos_subsectioncatalog` DISABLE KEYS */;
INSERT INTO `catalogos_subsectioncatalog` VALUES (1,'ADMINISTRACION','Administraci??n',1,'2026-07-08 17:46:51.422396','2026-07-16 18:19:56.062774',3),(2,'COMPRAS','Compras',1,'2026-07-08 17:46:51.424957','2026-07-16 18:19:56.065266',3),(3,'PRODUCCION','Producci??n',1,'2026-07-08 17:46:51.427576','2026-07-16 18:19:56.067869',3),(4,'INGENIERIA','Ingenier??a',1,'2026-07-08 17:46:51.430184','2026-07-16 18:19:56.070397',3),(5,'VENTAS','Ventas',1,'2026-07-08 17:46:51.432710','2026-07-16 18:19:56.073473',3),(6,'POSTVENTAS','Postventas',1,'2026-07-08 17:46:51.435257','2026-07-16 18:19:56.081061',3),(7,'RRHH','RRHH',1,'2026-07-08 17:46:51.437875','2026-07-16 18:19:56.083965',3),(8,'SERVICIOS_TERCEROS','Servicios de terceros',1,'2026-07-08 17:46:51.440489','2026-07-16 18:19:56.086657',3),(9,'OTROS','Otros',1,'2026-07-08 17:46:51.443106','2026-07-16 18:19:56.089149',3);
/*!40000 ALTER TABLE `catalogos_subsectioncatalog` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `catalogos_tipocatalog`
--

DROP TABLE IF EXISTS `catalogos_tipocatalog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `catalogos_tipocatalog` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `codigo` varchar(50) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(1) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `catalogos_t_codigo_f4b313_idx` (`codigo`,`activo`),
  KEY `catalogos_t_activo_a5f392_idx` (`activo`),
  KEY `catalogos_tipocatalog_activo_66e1e000` (`activo`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `catalogos_tipocatalog`
--

LOCK TABLES `catalogos_tipocatalog` WRITE;
/*!40000 ALTER TABLE `catalogos_tipocatalog` DISABLE KEYS */;
INSERT INTO `catalogos_tipocatalog` VALUES (1,'QUEJA_CLIENTE','Queja Cliente',1,'2026-07-08 17:46:51.447680','2026-07-16 18:19:56.092541'),(2,'NO_CONFORMIDAD','No Conformidad',1,'2026-07-08 17:46:51.449593','2026-07-16 18:19:56.094239'),(3,'OBSERVACION','Observaci??n',1,'2026-07-08 17:46:51.451571','2026-07-16 18:19:56.096008'),(4,'MEJORA_SUGERIDA','Mejora Sugerida',1,'2026-07-08 17:46:51.453479','2026-07-16 18:19:56.098011');
/*!40000 ALTER TABLE `catalogos_tipocatalog` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_chat`
--

DROP TABLE IF EXISTS `chat_chat`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_chat` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `fecha_creacion` datetime(6) NOT NULL,
  `hallazgo_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hallazgo_id` (`hallazgo_id`),
  CONSTRAINT `chat_chat_hallazgo_id_291a08f2_fk_hallazgos_hallazgo_id` FOREIGN KEY (`hallazgo_id`) REFERENCES `hallazgos_hallazgo` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_chat`
--

LOCK TABLES `chat_chat` WRITE;
/*!40000 ALTER TABLE `chat_chat` DISABLE KEYS */;
INSERT INTO `chat_chat` VALUES (1,'2026-07-08 17:48:50.053225',1),(2,'2026-07-14 16:12:40.800580',2),(3,'2026-07-14 16:43:05.314034',3),(5,'2026-07-16 16:48:52.020716',5),(6,'2026-07-16 17:15:00.055805',6),(7,'2026-07-16 17:16:08.373463',7);
/*!40000 ALTER TABLE `chat_chat` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_chat_participantes`
--

DROP TABLE IF EXISTS `chat_chat_participantes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_chat_participantes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `chat_id` bigint NOT NULL,
  `customuser_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `chat_chat_participantes_chat_id_customuser_id_8a22312b_uniq` (`chat_id`,`customuser_id`),
  KEY `chat_chat_participan_customuser_id_0fd07439_fk_users_cus` (`customuser_id`),
  CONSTRAINT `chat_chat_participan_customuser_id_0fd07439_fk_users_cus` FOREIGN KEY (`customuser_id`) REFERENCES `users_customuser` (`id`),
  CONSTRAINT `chat_chat_participantes_chat_id_043b694c_fk_chat_chat_id` FOREIGN KEY (`chat_id`) REFERENCES `chat_chat` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_chat_participantes`
--

LOCK TABLES `chat_chat_participantes` WRITE;
/*!40000 ALTER TABLE `chat_chat_participantes` DISABLE KEYS */;
INSERT INTO `chat_chat_participantes` VALUES (1,1,1),(15,1,3),(8,2,1),(7,2,2),(16,5,2),(18,7,1),(17,7,2);
/*!40000 ALTER TABLE `chat_chat_participantes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_mensaje`
--

DROP TABLE IF EXISTS `chat_mensaje`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_mensaje` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `contenido` longtext NOT NULL,
  `fecha_hora` datetime(6) NOT NULL,
  `autor_id` bigint NOT NULL,
  `chat_id` bigint NOT NULL,
  `tiene_urgente` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `chat_mensaje_autor_id_fb15a7b9_fk_users_customuser_id` (`autor_id`),
  KEY `chat_mensaj_chat_id_c7b317_idx` (`chat_id`,`tiene_urgente`),
  KEY `chat_mensaje_tiene_urgente_5acf1a0c` (`tiene_urgente`),
  KEY `chat_mensaj_tiene_u_21a93b_idx` (`tiene_urgente`),
  CONSTRAINT `chat_mensaje_autor_id_fb15a7b9_fk_users_customuser_id` FOREIGN KEY (`autor_id`) REFERENCES `users_customuser` (`id`),
  CONSTRAINT `chat_mensaje_chat_id_e5526d8d_fk_chat_chat_id` FOREIGN KEY (`chat_id`) REFERENCES `chat_chat` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_mensaje`
--

LOCK TABLES `chat_mensaje` WRITE;
/*!40000 ALTER TABLE `chat_mensaje` DISABLE KEYS */;
INSERT INTO `chat_mensaje` VALUES (1,'s','2026-07-08 18:32:41.109630',2,1,0),(2,'sas','2026-07-14 16:31:02.273545',1,2,0),(3,'que paso?','2026-07-14 16:46:25.541645',2,2,0),(4,'','2026-07-14 18:15:49.292757',1,1,0),(5,'hola','2026-07-16 17:17:27.744868',2,7,0);
/*!40000 ALTER TABLE `chat_mensaje` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contacto_externo_contactoexterno`
--

DROP TABLE IF EXISTS `contacto_externo_contactoexterno`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contacto_externo_contactoexterno` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `nombre_empresa` varchar(255) NOT NULL,
  `telefono` varchar(20) NOT NULL,
  `email` varchar(254) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `hallazgo_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hallazgo_id` (`hallazgo_id`),
  CONSTRAINT `contacto_externo_con_hallazgo_id_791b6117_fk_hallazgos` FOREIGN KEY (`hallazgo_id`) REFERENCES `hallazgos_hallazgo` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contacto_externo_contactoexterno`
--

LOCK TABLES `contacto_externo_contactoexterno` WRITE;
/*!40000 ALTER TABLE `contacto_externo_contactoexterno` DISABLE KEYS */;
INSERT INTO `contacto_externo_contactoexterno` VALUES (1,'adsads','234241412','dsds@gmail.com','2026-07-14 16:12:40.819156','2026-07-14 16:12:40.819182',2),(2,'ds','532432523','gasto@gmail.com','2026-07-14 16:43:05.327288','2026-07-14 16:43:05.327323',3);
/*!40000 ALTER TABLE `contacto_externo_contactoexterno` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_admin_log`
--

DROP TABLE IF EXISTS `django_admin_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_admin_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `action_time` datetime(6) NOT NULL,
  `object_id` longtext,
  `object_repr` varchar(200) NOT NULL,
  `action_flag` smallint unsigned NOT NULL,
  `change_message` longtext NOT NULL,
  `content_type_id` int DEFAULT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `django_admin_log_content_type_id_c4bce8eb_fk_django_co` (`content_type_id`),
  KEY `django_admin_log_user_id_c564eba6_fk_users_customuser_id` (`user_id`),
  CONSTRAINT `django_admin_log_content_type_id_c4bce8eb_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`),
  CONSTRAINT `django_admin_log_user_id_c564eba6_fk_users_customuser_id` FOREIGN KEY (`user_id`) REFERENCES `users_customuser` (`id`),
  CONSTRAINT `django_admin_log_chk_1` CHECK ((`action_flag` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_admin_log`
--

LOCK TABLES `django_admin_log` WRITE;
/*!40000 ALTER TABLE `django_admin_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `django_admin_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_content_type`
--

DROP TABLE IF EXISTS `django_content_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_content_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `app_label` varchar(100) NOT NULL,
  `model` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `django_content_type_app_label_model_76bd3d3b_uniq` (`app_label`,`model`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_content_type`
--

LOCK TABLES `django_content_type` WRITE;
/*!40000 ALTER TABLE `django_content_type` DISABLE KEYS */;
INSERT INTO `django_content_type` VALUES (13,'acciones','accion'),(14,'acciones','solicitudcierreaccion'),(1,'admin','logentry'),(23,'analisis_cinco_porques','analisiscincoporques'),(17,'archivos','archivo'),(3,'auth','group'),(2,'auth','permission'),(19,'catalogos','sectorcatalog'),(21,'catalogos','subsectioncatalog'),(20,'catalogos','tipocatalog'),(15,'chat','chat'),(16,'chat','mensaje'),(22,'contacto_externo','contactoexterno'),(4,'contenttypes','contenttype'),(11,'hallazgos','hallazgo'),(12,'hallazgos','hallazgoresponsable'),(25,'hallazgos','hallazgoresponsablehistorial'),(18,'notificaciones','notificacion'),(26,'reportes','reportehallazgos'),(5,'sessions','session'),(24,'solicitud_cambio_responsable','solicitudcambioresponsable'),(6,'token_blacklist','blacklistedtoken'),(7,'token_blacklist','outstandingtoken'),(10,'users','clienteprofile'),(8,'users','customuser'),(9,'users','empleadoprofile');
/*!40000 ALTER TABLE `django_content_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_migrations`
--

DROP TABLE IF EXISTS `django_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_migrations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `app` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `applied` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_migrations`
--

LOCK TABLES `django_migrations` WRITE;
/*!40000 ALTER TABLE `django_migrations` DISABLE KEYS */;
INSERT INTO `django_migrations` VALUES (1,'contenttypes','0001_initial','2026-07-08 17:46:45.289732'),(2,'contenttypes','0002_remove_content_type_name','2026-07-08 17:46:45.386307'),(3,'auth','0001_initial','2026-07-08 17:46:45.653170'),(4,'auth','0002_alter_permission_name_max_length','2026-07-08 17:46:45.718928'),(5,'auth','0003_alter_user_email_max_length','2026-07-08 17:46:45.725222'),(6,'auth','0004_alter_user_username_opts','2026-07-08 17:46:45.731450'),(7,'auth','0005_alter_user_last_login_null','2026-07-08 17:46:45.738327'),(8,'auth','0006_require_contenttypes_0002','2026-07-08 17:46:45.742727'),(9,'auth','0007_alter_validators_add_error_messages','2026-07-08 17:46:45.748919'),(10,'auth','0008_alter_user_username_max_length','2026-07-08 17:46:45.754944'),(11,'auth','0009_alter_user_last_name_max_length','2026-07-08 17:46:45.761744'),(12,'auth','0010_alter_group_name_max_length','2026-07-08 17:46:45.779413'),(13,'auth','0011_update_proxy_permissions','2026-07-08 17:46:45.787209'),(14,'auth','0012_alter_user_first_name_max_length','2026-07-08 17:46:45.793470'),(15,'users','0001_initial','2026-07-08 17:46:46.335479'),(16,'archivos','0001_initial','2026-07-08 17:46:46.434034'),(17,'hallazgos','0001_initial','2026-07-08 17:46:46.715634'),(18,'acciones','0001_initial','2026-07-08 17:46:46.821612'),(19,'acciones','0002_accion_archivos_solicitudcierreaccion_and_more','2026-07-08 17:46:47.212046'),(20,'admin','0001_initial','2026-07-08 17:46:47.360110'),(21,'admin','0002_logentry_remove_auto_add','2026-07-08 17:46:47.371940'),(22,'admin','0003_logentry_add_action_flag_choices','2026-07-08 17:46:47.382854'),(23,'hallazgos','0002_add_cliente_asociado_to_hallazgo','2026-07-08 17:46:47.462091'),(24,'analisis_cinco_porques','0001_initial','2026-07-08 17:46:47.747304'),(25,'chat','0001_initial','2026-07-08 17:46:48.135490'),(26,'chat','0002_mensaje_tiene_urgente','2026-07-08 17:46:48.245240'),(27,'chat','0003_rename_chat_mensaj_chat_id_tiene_u_idx_chat_mensaj_chat_id_c7b317_idx_and_more','2026-07-08 17:46:48.302215'),(28,'archivos','0002_archivo_hallazgo_archivo_mensaje_archivo_porque_and_more','2026-07-08 17:46:48.678679'),(29,'catalogos','0001_initial','2026-07-08 17:46:49.020043'),(30,'catalogos','0002_rename_catalogos_t_codigo_44b106_idx_catalogos_t_codigo_f4b313_idx_and_more','2026-07-08 17:46:49.046848'),(31,'contacto_externo','0001_initial','2026-07-08 17:46:49.143276'),(32,'hallazgos','0003_hallazgo_sector_hallazgo_subseccion_and_more','2026-07-08 17:46:49.499867'),(33,'notificaciones','0001_initial','2026-07-08 17:46:49.659867'),(34,'notificaciones','0002_notificacion_tipo_alter_notificacion_leida_and_more','2026-07-08 17:46:49.834129'),(35,'sessions','0001_initial','2026-07-08 17:46:49.879493'),(36,'solicitud_cambio_responsable','0001_initial','2026-07-08 17:46:50.237931'),(37,'token_blacklist','0001_initial','2026-07-08 17:46:50.439746'),(38,'token_blacklist','0002_outstandingtoken_jti_hex','2026-07-08 17:46:50.503987'),(39,'token_blacklist','0003_auto_20171017_2007','2026-07-08 17:46:50.523491'),(40,'token_blacklist','0004_auto_20171017_2013','2026-07-08 17:46:50.607041'),(41,'token_blacklist','0005_remove_outstandingtoken_jti','2026-07-08 17:46:50.675230'),(42,'token_blacklist','0006_auto_20171017_2113','2026-07-08 17:46:50.708259'),(43,'token_blacklist','0007_auto_20171017_2214','2026-07-08 17:46:50.914307'),(44,'token_blacklist','0008_migrate_to_bigautofield','2026-07-08 17:46:51.176840'),(45,'token_blacklist','0010_fix_migrate_to_bigautofield','2026-07-08 17:46:51.196292'),(46,'token_blacklist','0011_linearizes_history','2026-07-08 17:46:51.202314'),(47,'token_blacklist','0012_alter_outstandingtoken_user','2026-07-08 17:46:51.222786'),(48,'users','0002_alter_customuser_is_active','2026-07-08 17:46:51.241507'),(49,'hallazgos','0004_hallazgoresponsablehistorial','2026-07-14 18:08:52.789042'),(50,'notificaciones','0003_alter_notificacion_tipo','2026-07-14 18:08:52.810740'),(51,'reportes','0001_initial','2026-07-14 19:09:00.708295'),(52,'acciones','0003_rename_verificacion_eficiencia_to_eficacia','2026-07-16 17:34:29.522482');
/*!40000 ALTER TABLE `django_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `django_session`
--

DROP TABLE IF EXISTS `django_session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `django_session` (
  `session_key` varchar(40) NOT NULL,
  `session_data` longtext NOT NULL,
  `expire_date` datetime(6) NOT NULL,
  PRIMARY KEY (`session_key`),
  KEY `django_session_expire_date_a5c62663` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `django_session`
--

LOCK TABLES `django_session` WRITE;
/*!40000 ALTER TABLE `django_session` DISABLE KEYS */;
/*!40000 ALTER TABLE `django_session` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hallazgos_hallazgo`
--

DROP TABLE IF EXISTS `hallazgos_hallazgo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hallazgos_hallazgo` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `descripcion` longtext NOT NULL,
  `ubicacion` varchar(200) NOT NULL,
  `tipo` varchar(25) NOT NULL,
  `estado` varchar(20) NOT NULL,
  `fecha_creacion` date NOT NULL,
  `creado_por_id` bigint NOT NULL,
  `cliente_asociado_id` bigint DEFAULT NULL,
  `sector_id` bigint DEFAULT NULL,
  `subseccion_id` bigint DEFAULT NULL,
  `tipo_catalogo_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `hallazgos_hallazgo_creado_por_id_11e0d8e1_fk_users_customuser_id` (`creado_por_id`),
  KEY `hallazgos_hallazgo_cliente_asociado_id_c6fff211_fk_users_cus` (`cliente_asociado_id`),
  KEY `hallazgos_hallazgo_subseccion_id_4b0a5317_fk_catalogos` (`subseccion_id`),
  KEY `hallazgos_h_sector__859c9b_idx` (`sector_id`,`estado`),
  KEY `hallazgos_h_tipo_ca_8aa37b_idx` (`tipo_catalogo_id`,`estado`),
  CONSTRAINT `hallazgos_hallazgo_cliente_asociado_id_c6fff211_fk_users_cus` FOREIGN KEY (`cliente_asociado_id`) REFERENCES `users_customuser` (`id`),
  CONSTRAINT `hallazgos_hallazgo_creado_por_id_11e0d8e1_fk_users_customuser_id` FOREIGN KEY (`creado_por_id`) REFERENCES `users_customuser` (`id`),
  CONSTRAINT `hallazgos_hallazgo_sector_id_526bc1c3_fk_catalogos` FOREIGN KEY (`sector_id`) REFERENCES `catalogos_sectorcatalog` (`id`),
  CONSTRAINT `hallazgos_hallazgo_subseccion_id_4b0a5317_fk_catalogos` FOREIGN KEY (`subseccion_id`) REFERENCES `catalogos_subsectioncatalog` (`id`),
  CONSTRAINT `hallazgos_hallazgo_tipo_catalogo_id_3182053b_fk_catalogos` FOREIGN KEY (`tipo_catalogo_id`) REFERENCES `catalogos_tipocatalog` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hallazgos_hallazgo`
--

LOCK TABLES `hallazgos_hallazgo` WRITE;
/*!40000 ALTER TABLE `hallazgos_hallazgo` DISABLE KEYS */;
INSERT INTO `hallazgos_hallazgo` VALUES (1,'lasta','Todos lados','NO_CONFORMIDAD','CERRADO','2026-07-08',1,NULL,3,4,NULL),(2,'xzxz','Todos lados','NO_CONFORMIDAD','APROBADO','2026-07-14',1,NULL,1,NULL,NULL),(3,'ds','ds','QUEJA_CLIENTE','APROBADO','2026-07-14',1,NULL,1,NULL,NULL),(5,'que honda gente','dfsfwer34','OPORTUNIDAD_MEJORA','APROBADO','2026-07-16',2,NULL,3,4,NULL),(6,'eliminar puntos de soldadura de rotador','armado de equipos','OPORTUNIDAD_MEJORA','APROBADO','2026-07-16',1,NULL,3,3,NULL),(7,'eliminar puntos de soldadura en rotador','armado','OPORTUNIDAD_MEJORA','APROBADO','2026-07-16',2,NULL,3,3,NULL);
/*!40000 ALTER TABLE `hallazgos_hallazgo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hallazgos_hallazgoresponsable`
--

DROP TABLE IF EXISTS `hallazgos_hallazgoresponsable`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hallazgos_hallazgoresponsable` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `fecha_asignacion` datetime(6) NOT NULL,
  `hallazgo_id` bigint NOT NULL,
  `responsable_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_hallazgo_responsable` (`hallazgo_id`,`responsable_id`),
  KEY `hallazgos_hallazgore_responsable_id_69274ed6_fk_users_cus` (`responsable_id`),
  CONSTRAINT `hallazgos_hallazgore_hallazgo_id_26410155_fk_hallazgos` FOREIGN KEY (`hallazgo_id`) REFERENCES `hallazgos_hallazgo` (`id`),
  CONSTRAINT `hallazgos_hallazgore_responsable_id_69274ed6_fk_users_cus` FOREIGN KEY (`responsable_id`) REFERENCES `users_customuser` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hallazgos_hallazgoresponsable`
--

LOCK TABLES `hallazgos_hallazgoresponsable` WRITE;
/*!40000 ALTER TABLE `hallazgos_hallazgoresponsable` DISABLE KEYS */;
INSERT INTO `hallazgos_hallazgoresponsable` VALUES (1,'2026-07-08 17:48:55.831363',1,1),(7,'2026-07-14 16:29:22.528758',2,2),(8,'2026-07-14 16:30:55.454392',2,1),(15,'2026-07-14 18:37:29.133554',1,3),(16,'2026-07-16 16:55:00.731619',5,2),(17,'2026-07-16 17:16:35.603495',7,2),(18,'2026-07-16 17:17:16.277208',7,1);
/*!40000 ALTER TABLE `hallazgos_hallazgoresponsable` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hallazgos_hallazgoresponsablehistorial`
--

DROP TABLE IF EXISTS `hallazgos_hallazgoresponsablehistorial`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hallazgos_hallazgoresponsablehistorial` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `fecha_asignacion` datetime(6) NOT NULL,
  `fecha_remocion` datetime(6) DEFAULT NULL,
  `hallazgo_id` bigint NOT NULL,
  `responsable_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `hallazgos_hallazgore_responsable_id_317ad611_fk_users_cus` (`responsable_id`),
  KEY `hallazgos_h_hallazg_727ff5_idx` (`hallazgo_id`,`responsable_id`),
  KEY `hallazgos_h_fecha_a_ae23db_idx` (`fecha_asignacion`),
  CONSTRAINT `hallazgos_hallazgore_hallazgo_id_a4b46348_fk_hallazgos` FOREIGN KEY (`hallazgo_id`) REFERENCES `hallazgos_hallazgo` (`id`),
  CONSTRAINT `hallazgos_hallazgore_responsable_id_317ad611_fk_users_cus` FOREIGN KEY (`responsable_id`) REFERENCES `users_customuser` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hallazgos_hallazgoresponsablehistorial`
--

LOCK TABLES `hallazgos_hallazgoresponsablehistorial` WRITE;
/*!40000 ALTER TABLE `hallazgos_hallazgoresponsablehistorial` DISABLE KEYS */;
INSERT INTO `hallazgos_hallazgoresponsablehistorial` VALUES (3,'2026-07-14 18:28:16.945915',NULL,1,1),(4,'2026-07-14 18:28:16.955077',NULL,2,2),(5,'2026-07-14 18:28:16.962814',NULL,2,1),(6,'2026-07-14 18:37:10.688434','2026-07-14 18:37:20.340757',1,3),(7,'2026-07-14 18:37:29.134172',NULL,1,3),(8,'2026-07-16 16:55:00.732353',NULL,5,2),(9,'2026-07-16 17:16:35.604111',NULL,7,2),(10,'2026-07-16 17:17:16.278658',NULL,7,1);
/*!40000 ALTER TABLE `hallazgos_hallazgoresponsablehistorial` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notificaciones_notificacion`
--

DROP TABLE IF EXISTS `notificaciones_notificacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificaciones_notificacion` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `titulo` varchar(200) NOT NULL,
  `mensaje` longtext NOT NULL,
  `fecha` datetime(6) NOT NULL,
  `leida` tinyint(1) NOT NULL,
  `destinatario_id` bigint NOT NULL,
  `hallazgo_relacionado_id` bigint DEFAULT NULL,
  `tipo` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `notificaciones_notif_hallazgo_relacionado_c53e5a84_fk_hallazgos` (`hallazgo_relacionado_id`),
  KEY `notificaciones_notificacion_leida_445591c8` (`leida`),
  KEY `notificacio_destina_e3b819_idx` (`destinatario_id`,`tipo`,`leida`),
  KEY `notificacio_tipo_2df5d5_idx` (`tipo`),
  KEY `notificaciones_notificacion_tipo_48e88b04` (`tipo`),
  CONSTRAINT `notificaciones_notif_destinatario_id_5c420f59_fk_users_cus` FOREIGN KEY (`destinatario_id`) REFERENCES `users_customuser` (`id`),
  CONSTRAINT `notificaciones_notif_hallazgo_relacionado_c53e5a84_fk_hallazgos` FOREIGN KEY (`hallazgo_relacionado_id`) REFERENCES `hallazgos_hallazgo` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notificaciones_notificacion`
--

LOCK TABLES `notificaciones_notificacion` WRITE;
/*!40000 ALTER TABLE `notificaciones_notificacion` DISABLE KEYS */;
INSERT INTO `notificaciones_notificacion` VALUES (1,'Solicitud de cambio de responsable pendiente - Hallazgo #1','Responsable None None solicita cambiar responsable para hallazgo #1.','2026-07-08 18:13:06.436782',1,1,1,'cambio_responsable_pendiente'),(2,'Solicitud de cierre de accion','El empleado Mirko Diosquez solicito cerrar la accion INMEDIATA del hallazgo #1.','2026-07-08 19:18:27.568742',1,1,1,'cierre_pendiente'),(3,'Cierre de accion aprobado','La solicitud de cierre de la accion INMEDIATA del hallazgo #1 fue aprobada.','2026-07-08 19:19:01.520512',1,2,1,'cierre_pendiente'),(4,'Solicitud de cambio de responsable pendiente - Hallazgo #1','Responsable None None solicita cambiar responsable para hallazgo #1.','2026-07-08 19:38:05.587902',1,1,1,'cambio_responsable_pendiente'),(5,'Asignado como responsable','Has sido asignado como responsable del hallazgo #2 de tipo NO_CONFORMIDAD.','2026-07-14 16:28:19.113245',1,2,2,'asignado_responsable'),(6,'Solicitud de cambio de responsable pendiente - Hallazgo #2','Responsable Mirko Diosquez solicita cambiar responsable para hallazgo #2.','2026-07-14 16:29:04.513204',1,1,2,'cambio_responsable_pendiente'),(7,'Solicitud de cambio aprobada - Hallazgo #2','Tu solicitud de cambio de responsable ha sido aprobada.','2026-07-14 16:29:22.532894',1,2,2,'cambio_responsable_pendiente'),(8,'Asignado como responsable','Has sido asignado como responsable del hallazgo #2 de tipo NO_CONFORMIDAD.','2026-07-14 16:30:55.456414',1,1,2,'asignado_responsable'),(9,'Nuevo mensaje en hallazgo #2','santiago buhler: sas...','2026-07-14 16:31:02.282720',1,2,2,'mensaje_sin_leer'),(10,'Nuevo mensaje en hallazgo #2','Mirko Diosquez: que paso?...','2026-07-14 16:46:25.549949',1,1,2,'mensaje_sin_leer'),(19,'Asignado como responsable','Has sido asignado como responsable del hallazgo #4 de tipo NO_CONFORMIDAD.','2026-07-14 18:12:37.660923',1,2,NULL,'asignado_responsable'),(20,'Removido como responsable','Has sido removido como responsable del hallazgo #4.','2026-07-14 18:12:37.738511',1,2,NULL,'asignado_responsable'),(21,'Nuevo mensaje en hallazgo #1','santiago buhler: ...','2026-07-14 18:15:49.299972',0,3,1,'mensaje_sin_leer'),(22,'Removido como responsable','Has sido removido como responsable del hallazgo #1.','2026-07-14 18:25:33.860393',0,3,1,'asignado_responsable'),(23,'Asignado como responsable','Has sido asignado como responsable del hallazgo #1 de tipo NO_CONFORMIDAD.','2026-07-14 18:26:08.208860',0,3,1,'asignado_responsable'),(24,'Removido como responsable','Has sido removido como responsable del hallazgo #1.','2026-07-14 18:26:13.882014',0,3,1,'asignado_responsable'),(25,'Asignado como responsable','Has sido asignado como responsable del hallazgo #1 de tipo NO_CONFORMIDAD.','2026-07-14 18:32:32.248132',0,3,1,'asignado_responsable'),(26,'Removido como responsable','Has sido removido como responsable del hallazgo #1.','2026-07-14 18:32:41.609942',0,3,1,'asignado_responsable'),(27,'Asignado como responsable','Has sido asignado como responsable del hallazgo #1 de tipo NO_CONFORMIDAD.','2026-07-14 18:32:49.399774',0,3,1,'asignado_responsable'),(28,'Removido como responsable','Has sido removido como responsable del hallazgo #1.','2026-07-14 18:33:11.978865',0,3,1,'asignado_responsable'),(29,'Asignado como responsable','Has sido asignado como responsable del hallazgo #1 de tipo NO_CONFORMIDAD.','2026-07-14 18:33:15.320384',0,3,1,'asignado_responsable'),(30,'Removido como responsable','Has sido removido como responsable del hallazgo #1.','2026-07-14 18:37:04.161409',0,3,1,'asignado_responsable'),(31,'Asignado como responsable','Has sido asignado como responsable del hallazgo #1 de tipo NO_CONFORMIDAD.','2026-07-14 18:37:10.691056',0,3,1,'asignado_responsable'),(32,'Removido como responsable','Has sido removido como responsable del hallazgo #1.','2026-07-14 18:37:20.353226',0,3,1,'asignado_responsable'),(33,'Asignado como responsable','Has sido asignado como responsable del hallazgo #1 de tipo NO_CONFORMIDAD.','2026-07-14 18:37:29.136653',0,3,1,'asignado_responsable'),(34,'Solicitud de cierre de accion','El empleado santiago buhler solicito cerrar la accion CORRECTIVA del hallazgo #2.','2026-07-14 19:54:03.557310',1,1,2,'cierre_pendiente'),(35,'Cierre de accion aprobado','La solicitud de cierre de la accion CORRECTIVA del hallazgo #2 fue aprobada.','2026-07-14 19:54:27.935660',1,1,2,'cierre_pendiente'),(36,'Nuevo hallazgo registrado','Se registro un hallazgo de tipo OPORTUNIDAD_MEJORA con estado PENDIENTE.','2026-07-16 16:48:52.024607',1,1,5,'cierre_pendiente'),(37,'Asignado como responsable','Has sido asignado como responsable del hallazgo #5 de tipo OPORTUNIDAD_MEJORA.','2026-07-16 16:55:00.741097',1,2,5,'asignado_responsable'),(38,'Solicitud de cierre de accion','El empleado santiago buhler solicito cerrar la accion CORRECTIVA del hallazgo #1.','2026-07-16 16:59:40.639408',1,1,1,'cierre_pendiente'),(39,'Solicitud de cierre de accion','El empleado santiago buhler solicito cerrar la accion VERIFICACION_EFICIENCIA del hallazgo #1.','2026-07-16 17:00:13.313888',1,1,1,'cierre_pendiente'),(40,'Cierre de accion aprobado','La solicitud de cierre de la accion VERIFICACION_EFICIENCIA del hallazgo #1 fue aprobada.','2026-07-16 17:00:27.662693',1,1,1,'cierre_pendiente'),(41,'Cierre de accion aprobado','La solicitud de cierre de la accion CORRECTIVA del hallazgo #1 fue aprobada.','2026-07-16 17:00:31.503329',1,1,1,'cierre_pendiente'),(42,'Nuevo hallazgo registrado','Se registro un hallazgo de tipo OPORTUNIDAD_MEJORA con estado PENDIENTE.','2026-07-16 17:16:08.375228',1,1,7,'cierre_pendiente'),(43,'Asignado como responsable','Has sido asignado como responsable del hallazgo #7 de tipo OPORTUNIDAD_MEJORA.','2026-07-16 17:16:35.607314',1,2,7,'asignado_responsable'),(44,'Asignado como responsable','Has sido asignado como responsable del hallazgo #7 de tipo OPORTUNIDAD_MEJORA.','2026-07-16 17:17:16.284722',1,1,7,'asignado_responsable'),(45,'Nuevo mensaje en hallazgo #7','Mirko Diosquez: hola...','2026-07-16 17:17:27.754003',1,1,7,'mensaje_sin_leer'),(46,'Porqu?? pendiente de aprobaci??n ??? Hallazgo #7','El responsable Mirko Diosquez agreg?? un nuevo porqu?? que requiere tu aprobaci??n en el Hallazgo #7.','2026-07-16 18:05:26.057203',1,1,7,'aprobacion_porque_pendiente'),(47,'Porqu?? pendiente de aprobaci??n ??? Hallazgo #7','El responsable Mirko Diosquez agreg?? un nuevo porqu?? que requiere tu aprobaci??n en el Hallazgo #7.','2026-07-16 18:05:31.162127',1,1,7,'aprobacion_porque_pendiente'),(48,'Porqu?? pendiente de aprobaci??n ??? Hallazgo #7','El responsable Mirko Diosquez agreg?? un nuevo porqu?? que requiere tu aprobaci??n en el Hallazgo #7.','2026-07-16 18:05:34.816736',1,1,7,'aprobacion_porque_pendiente'),(49,'Tu porqu?? fue aprobado ??? Hallazgo #7','El administrador aprob?? tu porqu?? en el Hallazgo #7.','2026-07-16 18:05:46.276250',1,2,7,'aprobacion_porque_pendiente'),(50,'Tu porqu?? fue rechazado - Hallazgo #7','Tu porqu?? en Hallazgo #7 ha sido rechazado.','2026-07-16 18:05:52.552766',1,2,7,'aprobacion_porque_pendiente'),(51,'Tu porqu?? fue rechazado - Hallazgo #7','Tu porqu?? en Hallazgo #7 ha sido rechazado.','2026-07-16 18:05:52.554066',1,1,7,'aprobacion_porque_pendiente'),(52,'Tu porqu?? fue rechazado - Hallazgo #7','Tu porqu?? en Hallazgo #7 ha sido rechazado.','2026-07-16 18:05:52.554501',1,2,7,'aprobacion_porque_pendiente'),(53,'Tu porqu?? fue aprobado ??? Hallazgo #7','El administrador aprob?? tu porqu?? en el Hallazgo #7.','2026-07-16 18:05:56.920510',1,2,7,'aprobacion_porque_pendiente'),(54,'Porqu?? pendiente de aprobaci??n ??? Hallazgo #7','El responsable Mirko Diosquez agreg?? un nuevo porqu?? que requiere tu aprobaci??n en el Hallazgo #7.','2026-07-16 18:12:29.588530',1,1,7,'aprobacion_porque_pendiente'),(55,'Porqu?? pendiente de aprobaci??n ??? Hallazgo #7','El responsable Mirko Diosquez agreg?? un nuevo porqu?? que requiere tu aprobaci??n en el Hallazgo #7.','2026-07-16 18:12:33.678190',1,1,7,'aprobacion_porque_pendiente'),(56,'Porqu?? pendiente de aprobaci??n ??? Hallazgo #7','El responsable Mirko Diosquez agreg?? un nuevo porqu?? que requiere tu aprobaci??n en el Hallazgo #7.','2026-07-16 18:12:39.045765',1,1,7,'aprobacion_porque_pendiente'),(57,'Porqu?? pendiente de aprobaci??n ??? Hallazgo #7','El responsable Mirko Diosquez agreg?? un nuevo porqu?? que requiere tu aprobaci??n en el Hallazgo #7.','2026-07-16 18:12:42.137842',1,1,7,'aprobacion_porque_pendiente'),(58,'Tu porqu?? fue aprobado ??? Hallazgo #7','El administrador aprob?? tu porqu?? en el Hallazgo #7.','2026-07-16 18:12:54.199154',0,2,7,'aprobacion_porque_pendiente'),(59,'Tu porqu?? fue aprobado ??? Hallazgo #7','El administrador aprob?? tu porqu?? en el Hallazgo #7.','2026-07-16 18:12:56.734022',0,2,7,'aprobacion_porque_pendiente'),(60,'Tu porqu?? fue aprobado ??? Hallazgo #7','El administrador aprob?? tu porqu?? en el Hallazgo #7.','2026-07-16 18:12:59.295107',0,2,7,'aprobacion_porque_pendiente'),(61,'Tu porqu?? fue rechazado - Hallazgo #7','Tu porqu?? en Hallazgo #7 ha sido rechazado.','2026-07-16 18:13:14.523544',0,2,7,'aprobacion_porque_pendiente'),(62,'Tu porqu?? fue rechazado - Hallazgo #7','Tu porqu?? en Hallazgo #7 ha sido rechazado.','2026-07-16 18:13:14.524809',1,1,7,'aprobacion_porque_pendiente'),(63,'Tu porqu?? fue rechazado - Hallazgo #7','Tu porqu?? en Hallazgo #7 ha sido rechazado.','2026-07-16 18:13:14.525901',0,2,7,'aprobacion_porque_pendiente');
/*!40000 ALTER TABLE `notificaciones_notificacion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reportes_reportehallazgos`
--

DROP TABLE IF EXISTS `reportes_reportehallazgos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reportes_reportehallazgos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `archivo` varchar(100) NOT NULL,
  `fecha_creacion` datetime(6) NOT NULL,
  `creado_por_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `reportes_reportehall_creado_por_id_f1805a8b_fk_users_cus` (`creado_por_id`),
  CONSTRAINT `reportes_reportehall_creado_por_id_f1805a8b_fk_users_cus` FOREIGN KEY (`creado_por_id`) REFERENCES `users_customuser` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reportes_reportehallazgos`
--

LOCK TABLES `reportes_reportehallazgos` WRITE;
/*!40000 ALTER TABLE `reportes_reportehallazgos` DISABLE KEYS */;
INSERT INTO `reportes_reportehallazgos` VALUES (5,'reporte_hallazgos_20260716_164947.xlsm','reportes/1/reporte_hallazgos_20260716_164947.xlsm','2026-07-16 16:49:47.488826',1),(6,'reporte_hallazgos_20260716_172308.xlsm','reportes/1/reporte_hallazgos_20260716_172308.xlsm','2026-07-16 17:23:08.794823',1);
/*!40000 ALTER TABLE `reportes_reportehallazgos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `solicitud_cambio_responsable_solicitudcambioresponsable`
--

DROP TABLE IF EXISTS `solicitud_cambio_responsable_solicitudcambioresponsable`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitud_cambio_responsable_solicitudcambioresponsable` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tipo` varchar(20) NOT NULL,
  `estado` varchar(20) NOT NULL,
  `observacion_rechazo` longtext NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `aprobado_por_id` bigint DEFAULT NULL,
  `hallazgo_id` bigint NOT NULL,
  `solicitante_id` bigint NOT NULL,
  `usuario_propuesto_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `solicitud_cambio_res_aprobado_por_id_72fa10e6_fk_users_cus` (`aprobado_por_id`),
  KEY `solicitud_cambio_res_usuario_propuesto_id_5b93a292_fk_users_cus` (`usuario_propuesto_id`),
  KEY `solicitud_cambio_responsabl_estado_266fd680` (`estado`),
  KEY `solicitud_c_hallazg_b9b42e_idx` (`hallazgo_id`,`estado`),
  KEY `solicitud_c_solicit_5a81c0_idx` (`solicitante_id`,`estado`),
  KEY `solicitud_c_estado_c4c6e2_idx` (`estado`),
  CONSTRAINT `solicitud_cambio_res_aprobado_por_id_72fa10e6_fk_users_cus` FOREIGN KEY (`aprobado_por_id`) REFERENCES `users_customuser` (`id`),
  CONSTRAINT `solicitud_cambio_res_hallazgo_id_797b6035_fk_hallazgos` FOREIGN KEY (`hallazgo_id`) REFERENCES `hallazgos_hallazgo` (`id`),
  CONSTRAINT `solicitud_cambio_res_solicitante_id_29449426_fk_users_cus` FOREIGN KEY (`solicitante_id`) REFERENCES `users_customuser` (`id`),
  CONSTRAINT `solicitud_cambio_res_usuario_propuesto_id_5b93a292_fk_users_cus` FOREIGN KEY (`usuario_propuesto_id`) REFERENCES `users_customuser` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `solicitud_cambio_responsable_solicitudcambioresponsable`
--

LOCK TABLES `solicitud_cambio_responsable_solicitudcambioresponsable` WRITE;
/*!40000 ALTER TABLE `solicitud_cambio_responsable_solicitudcambioresponsable` DISABLE KEYS */;
INSERT INTO `solicitud_cambio_responsable_solicitudcambioresponsable` VALUES (4,'cambiar','rechazada','porque no terminate','2026-07-08 18:13:06.434394','2026-07-08 18:14:28.343097',1,1,2,1),(5,'cambiar','aprobada','ya termine con mi parte','2026-07-08 19:38:05.584982','2026-07-08 19:41:46.525050',1,1,2,3),(6,'cambiar','aprobada','sas','2026-07-14 16:29:04.509135','2026-07-14 16:29:22.532042',1,2,2,2);
/*!40000 ALTER TABLE `solicitud_cambio_responsable_solicitudcambioresponsable` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `token_blacklist_blacklistedtoken`
--

DROP TABLE IF EXISTS `token_blacklist_blacklistedtoken`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `token_blacklist_blacklistedtoken` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `blacklisted_at` datetime(6) NOT NULL,
  `token_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_id` (`token_id`),
  CONSTRAINT `token_blacklist_blacklistedtoken_token_id_3cc7fe56_fk` FOREIGN KEY (`token_id`) REFERENCES `token_blacklist_outstandingtoken` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `token_blacklist_blacklistedtoken`
--

LOCK TABLES `token_blacklist_blacklistedtoken` WRITE;
/*!40000 ALTER TABLE `token_blacklist_blacklistedtoken` DISABLE KEYS */;
INSERT INTO `token_blacklist_blacklistedtoken` VALUES (1,'2026-07-08 18:12:22.335846',2),(2,'2026-07-08 18:32:16.211245',4),(3,'2026-07-08 19:47:32.537104',5),(4,'2026-07-14 17:16:21.514363',14),(5,'2026-07-14 17:18:15.924878',16),(6,'2026-07-16 17:44:39.270569',34);
/*!40000 ALTER TABLE `token_blacklist_blacklistedtoken` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `token_blacklist_outstandingtoken`
--

DROP TABLE IF EXISTS `token_blacklist_outstandingtoken`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `token_blacklist_outstandingtoken` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `token` longtext NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `expires_at` datetime(6) NOT NULL,
  `user_id` bigint DEFAULT NULL,
  `jti` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_uniq` (`jti`),
  KEY `token_blacklist_outs_user_id_83bc629a_fk_users_cus` (`user_id`),
  CONSTRAINT `token_blacklist_outs_user_id_83bc629a_fk_users_cus` FOREIGN KEY (`user_id`) REFERENCES `users_customuser` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `token_blacklist_outstandingtoken`
--

LOCK TABLES `token_blacklist_outstandingtoken` WRITE;
/*!40000 ALTER TABLE `token_blacklist_outstandingtoken` DISABLE KEYS */;
INSERT INTO `token_blacklist_outstandingtoken` VALUES (1,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDEzNzYzOSwiaWF0IjoxNzgzNTMyODM5LCJqdGkiOiI2ZWRkMGRhM2MyYzE0MGQyYTMyODI5Njc2NGIwZThiZiIsInVzZXJfaWQiOjF9.uetyDJOyjuNyHn9PUcvIv0hInG9B0tjuaCl7DoPRdKA','2026-07-08 17:47:19.465314','2026-07-15 17:47:19.000000',1,'6edd0da3c2c140d2a328296764b0e8bf'),(2,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDEzNDgxOSwiaWF0IjoxNzgzNTMwMDE5LCJqdGkiOiI2OWYyNDQxZTcwOGM0Yjc5YTJhYzRlNTdhMmM0MTRlMyIsInVzZXJfaWQiOjJ9.LkR6-iS8mLwZvRoZ_PgSL3qzQ3YL1_4PIQCgHYxEGs4',NULL,'2026-07-15 17:00:19.000000',NULL,'69f2441e708c4b79a2ac4e57a2c414e3'),(3,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDEzOTE3MiwiaWF0IjoxNzgzNTM0MzcyLCJqdGkiOiIyYjMwZDlkZWI1Yzk0NTJjYTNmYmNhODE4NWJkYzliMSIsInVzZXJfaWQiOjJ9.Ao8CK0Rn4NdTUPvMLBPhzI2HSwY5lB3eCAsfPsVzW-I','2026-07-08 18:12:52.761827','2026-07-15 18:12:52.000000',2,'2b30d9deb5c9452ca3fbca8185bdc9b1'),(4,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDE0MDMwNSwiaWF0IjoxNzgzNTM1NTA1LCJqdGkiOiI1OTYzNjU3N2I4MTM0N2RkOGIxZTI4NWMxN2VmOWUwZSIsInVzZXJfaWQiOjF9.KmAmLFMzTmtzPRLI1LQVCDaG_rZg_vO0d_DUUQ27H7c','2026-07-08 18:31:45.008057','2026-07-15 18:31:45.000000',1,'59636577b81347dd8b1e285c17ef9e0e'),(5,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDE0MDM1NSwiaWF0IjoxNzgzNTM1NTU1LCJqdGkiOiIzMmY0NWE0MjBkMGM0YjI4OGFlMmZjYmQwNWI4MjFhOCIsInVzZXJfaWQiOjJ9.w98NY-aeemZ_E_SugB7K81-vEeJp-UbWTqwbmwRAFg0','2026-07-08 18:32:35.950840','2026-07-15 18:32:35.000000',2,'32f45a420d0c4b288ae2fcbd05b821a8'),(6,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDE0NDQ5MCwiaWF0IjoxNzgzNTM5NjkwLCJqdGkiOiIyNzYwN2Q5YmI3MTY0ODU4YjkxMzAwNGYyNjA1NmJhMCIsInVzZXJfaWQiOjF9.ft4rX5fZf8W1Ir8Fqyrzk4sbZlwyvTgIVID9BrmrqtE','2026-07-08 19:41:30.542281','2026-07-15 19:41:30.000000',1,'27607d9bb7164858b913004f26056ba0'),(7,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDE0NDc2MSwiaWF0IjoxNzgzNTM5OTYxLCJqdGkiOiIzZGNiMTA0YjMyOWY0NDdhOWZiNDA2MmVkYzJhYTgwOCIsInVzZXJfaWQiOjF9.poMf6ZRAivW1Q417WeX0gUptZ7fN9duBR9z6_yrDrTs','2026-07-08 19:46:01.367196','2026-07-15 19:46:01.000000',1,'3dcb104b329f447a9fb4062edc2aa808'),(8,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDE0NDg2MywiaWF0IjoxNzgzNTQwMDYzLCJqdGkiOiI1N2YxN2UyNmE0MTE0ZjkwODdlMjJkMWQ3ZTY4NDRiMiIsInVzZXJfaWQiOjF9.hG55lvv3AuWQJw1w42bgPh2UzjSFiQxHUA8dKWl4xdY','2026-07-08 19:47:43.428069','2026-07-15 19:47:43.000000',1,'57f17e26a4114f9087e22d1d7e6844b2'),(9,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDE0NDkzOSwiaWF0IjoxNzgzNTQwMTM5LCJqdGkiOiI3OTc1MGU5NDQzNDU0MmIyYjE1NmViODAyNmE3MDIzOCIsInVzZXJfaWQiOjF9.CQmWvnLU8PaVgGztcUoY6L4EIb0QVgPIV3BLI399p7s','2026-07-08 19:48:59.598298','2026-07-15 19:48:59.000000',1,'79750e94434542b2b156eb8026a70238'),(10,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDE0NTEzMCwiaWF0IjoxNzgzNTQwMzMwLCJqdGkiOiI5ODQ5N2JkYTJmN2Q0Zjg5YWE1ZjM3MzJlZmRhYmQ2OCIsInVzZXJfaWQiOjF9.4SItEY5nQLRn6pcsNX9g_xciH7Ldg5ZWGUi675168i0','2026-07-08 19:52:10.957629','2026-07-15 19:52:10.000000',1,'98497bda2f7d4f89aa5f3732efdabd68'),(11,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDY1MDIzMSwiaWF0IjoxNzg0MDQ1NDMxLCJqdGkiOiI3NjZhMzAwNzBkZjQ0NTMyYTczNzJkOTk2Yzg2MWIyOCIsInVzZXJfaWQiOjJ9.YFJqhVG8K9pRuVVugTevHwWFQunU2YyB4DI0Ulxlwi0','2026-07-14 16:10:31.462001','2026-07-21 16:10:31.000000',2,'766a30070df44532a7372d996c861b28'),(12,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDY1MTI2OCwiaWF0IjoxNzg0MDQ2NDY4LCJqdGkiOiI0YWM0OWM1Mjc0MWE0ZGI3YjAxMzQzNTc1N2YwNjU2YSIsInVzZXJfaWQiOjF9.vvJ3ionqSPrrByrDKN5hpep5VAyZwCTi_O1ttJhaGyM','2026-07-14 16:27:48.427638','2026-07-21 16:27:48.000000',1,'4ac49c52741a4db7b013435757f0656a'),(13,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDY1MTMzMSwiaWF0IjoxNzg0MDQ2NTMxLCJqdGkiOiI3ZjM4ZDBkMDcxZWY0MmFlOGM5YzUxYjIyNzExMzg2OSIsInVzZXJfaWQiOjJ9.hU35aYN5Gjwt_bckpVihVtyu-UiMXy2t-ybv2gTi4Ig','2026-07-14 16:28:51.254728','2026-07-21 16:28:51.000000',2,'7f38d0d071ef42ae8c9c51b227113869'),(14,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDY1MjE1MSwiaWF0IjoxNzg0MDQ3MzUxLCJqdGkiOiI3NDNlNzU3MjlkMjA0MmNlOWY1ZWQyMGFhOTNkMGUxNCIsInVzZXJfaWQiOjF9.042ekN0ubkRPAxIrqSK24lrofjfw3jarBEMsGxjAZ94','2026-07-14 16:42:31.941864','2026-07-21 16:42:31.000000',1,'743e75729d2042ce9f5ed20aa93d0e14'),(15,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDY1MzQwMCwiaWF0IjoxNzg0MDQ4NjAwLCJqdGkiOiIwZTJmZWYxMDhhOGU0ODBmYTQ2ZGVlMDk5YTU4MDFlMCIsInVzZXJfaWQiOjF9.iE6EnKYaW7ej9F4kjAi0KdlJ4dlJ5PPNTLpJQu3X_kA','2026-07-14 17:03:20.564409','2026-07-21 17:03:20.000000',1,'0e2fef108a8e480fa46dee099a5801e0'),(16,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDY1NDE1OSwiaWF0IjoxNzg0MDQ5MzU5LCJqdGkiOiI2YjBmNWEzMWRmYzQ0ZmViOGQzYjkzYjZmYzVhYzkyYiIsInVzZXJfaWQiOjF9.reXrWs-aFqFXv55BZk5G9R7Scx4xAg_YnBtv_-G9-Ig','2026-07-14 17:15:59.000334','2026-07-21 17:15:59.000000',1,'6b0f5a31dfc44feb8d3b93b6fc5ac92b'),(17,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDY1NDIwMCwiaWF0IjoxNzg0MDQ5NDAwLCJqdGkiOiJkNWFiMjcwMzAzZjM0ODlhYTU2MTFlZTBhYmFjMDQ0OCIsInVzZXJfaWQiOjJ9.kuNAOGvKNJA3aMl7o1eKYyt1C38XzVfgnDhWN5JdLuA','2026-07-14 17:16:40.287710','2026-07-21 17:16:40.000000',2,'d5ab270303f3489aa5611ee0abac0448'),(18,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDY1NDMwNCwiaWF0IjoxNzg0MDQ5NTA0LCJqdGkiOiI1ZGM1OTRjNDVmODg0YjNhYjkzYWRiYjc1NWI3Y2JkZCIsInVzZXJfaWQiOjF9.hQU-eRLUykECKtyUzfaLCqzSuFIHYP2clAVNPkELZ30','2026-07-14 17:18:24.127974','2026-07-21 17:18:24.000000',1,'5dc594c45f884b3ab93adbb755b7cbdd'),(19,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDY1NDU3NiwiaWF0IjoxNzg0MDQ5Nzc2LCJqdGkiOiI1NTczNGQyZGNmMDI0MGVmYTAwODU3ZTAyMjQyY2UwZCIsInVzZXJfaWQiOjF9.VYtH8dgugFEiPaFra9sa2JnQSzg6eVpTEEeNNcNJI5E','2026-07-14 17:22:56.629303','2026-07-21 17:22:56.000000',1,'55734d2dcf0240efa00857e02242ce0d'),(20,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDY1NTIzMywiaWF0IjoxNzg0MDUwNDMzLCJqdGkiOiIzMzRlYWI0OGM1ODI0NmIwYjIzYTRlYmNhYWY1MDMxMSIsInVzZXJfaWQiOjF9.B0392qcCLk5dkRZPnLtWnecchmT7h_e8CJ1VXBDqyGg','2026-07-14 17:33:53.679935','2026-07-21 17:33:53.000000',1,'334eab48c58246b0b23a4ebcaaf50311'),(21,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDY1NTMxOSwiaWF0IjoxNzg0MDUwNTE5LCJqdGkiOiJhNWY1ZmUyYmVkZDA0YWRkYWVjNTNiNzRlODQ4ODc4YSIsInVzZXJfaWQiOjF9.iOqfnGNsXBMhll3MzU0_isJA8L1VAVoZQNNmsA6wXyc','2026-07-14 17:35:19.432865','2026-07-21 17:35:19.000000',1,'a5f5fe2bedd04addaec53b74e848878a'),(22,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDY1NjE2OSwiaWF0IjoxNzg0MDUxMzY5LCJqdGkiOiJhMGNjNjk4ZjdlZGQ0MjM5OTIxZjI2YTVmM2VhZDI4NyIsInVzZXJfaWQiOjF9.0qP-dw9Yma94LtretCftQedBZmYHFcSmQ7Xfm-4R4IQ','2026-07-14 17:49:29.106459','2026-07-21 17:49:29.000000',1,'a0cc698f7edd4239921f26a5f3ead287'),(23,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDY1ODYzOSwiaWF0IjoxNzg0MDUzODM5LCJqdGkiOiJhODI3M2QxMDA4YTk0ZDczYTA0YmRmMzY0NzEyYTQ3YyIsInVzZXJfaWQiOjF9.VBqoTFpgqHWi7CsaDixZvFIz2ufGv1jjfxZV5Tk5HSY','2026-07-14 18:30:39.092794','2026-07-21 18:30:39.000000',1,'a8273d1008a94d73a04bdf364712a47c'),(24,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDY1ODk5NywiaWF0IjoxNzg0MDU0MTk3LCJqdGkiOiIxYmI4N2FkOGJlMGI0NmY2YmFjN2FmZGQ3YmMzNjViNyIsInVzZXJfaWQiOjF9.bkhO9Tp6ma66dDR8W2f5wwidxPkKvc6H0NBULatET3o','2026-07-14 18:36:37.708052','2026-07-21 18:36:37.000000',1,'1bb87ad8be0b46f6bac7afdd7bc365b7'),(25,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDY1OTM2MywiaWF0IjoxNzg0MDU0NTYzLCJqdGkiOiJjYWRlMWU0YjllZGI0NGExYjhjYmMzNmQ2MjM1ZGJlOCIsInVzZXJfaWQiOjF9.m1_z3_PQeO8gJcX8cDAR27g9CSw7N0r9mGHZpiA6O0Q','2026-07-14 18:42:43.854125','2026-07-21 18:42:43.000000',1,'cade1e4b9edb44a1b8cbc36d6235dbe8'),(26,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDY1OTU5MiwiaWF0IjoxNzg0MDU0NzkyLCJqdGkiOiIwM2VjZmI5MGFkYmQ0YTE4OGM5Yjg1YWI2Nzc2ZjM1NSIsInVzZXJfaWQiOjF9.wA8IQuLekuiFgjhmBFS4__B-5cvbYQ_Bx2nTx4aPuv4','2026-07-14 18:46:32.687991','2026-07-21 18:46:32.000000',1,'03ecfb90adbd4a188c9b85ab6776f355'),(27,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDY1OTc1MCwiaWF0IjoxNzg0MDU0OTUwLCJqdGkiOiIxYjU3N2EzNThiN2I0ODE0YjRjOTJkODg5ZWM3MmEwNCIsInVzZXJfaWQiOjF9.JDbIjIZFroOakSlE9TAZ9qeQ6h2RIiPMbaphMmT4u2M','2026-07-14 18:49:10.960658','2026-07-21 18:49:10.000000',1,'1b577a358b7b4814b4c92d889ec72a04'),(28,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDgyNTI2MywiaWF0IjoxNzg0MjIwNDYzLCJqdGkiOiJlMWM3ZTI0NGNiN2E0YjgzOWMzYjU2ZmJlNmVlODUwMyIsInVzZXJfaWQiOjF9.P28TtN-4o-psZ4cySzmLMEsTFSsdYjyRsoc1QTZnicM','2026-07-16 16:47:43.625377','2026-07-23 16:47:43.000000',1,'e1c7e244cb7a4b839c3b56fbe6ee8503'),(29,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDgyNTI5NSwiaWF0IjoxNzg0MjIwNDk1LCJqdGkiOiI3MmZhZTAyNjg0YzE0MmQ4YWJkZjBkNGRmYTEyMTU2OCIsInVzZXJfaWQiOjJ9.ocOSteLpOIZYdWZB0XtqB5SmJiW_sljrxTCcW2LhkP8','2026-07-16 16:48:15.130754','2026-07-23 16:48:15.000000',2,'72fae02684c142d8abdf0d4dfa121568'),(30,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDgyNjkxOSwiaWF0IjoxNzg0MjIyMTE5LCJqdGkiOiI5YzliYzAyN2JlYTA0NmMyOTc5YTA1NTNkNzlkMTAwYyIsInVzZXJfaWQiOjJ9.53k0jUN9knKDHnPwSoce8nHyMoLz0VIV9HckOBa-xLg','2026-07-16 17:15:19.124641','2026-07-23 17:15:19.000000',2,'9c9bc027bea046c2979a0553d79d100c'),(31,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDgyNzI1MSwiaWF0IjoxNzg0MjIyNDUxLCJqdGkiOiJmOGRmODU4ZTc0Njc0NDRmYWI2YWMxYjA4MDdlZjY5NiIsInVzZXJfaWQiOjF9.l3XNzZb9yVtjpVCfiJc0OS0HzptkC993VCP5CQ0P7lY','2026-07-16 17:20:51.600616','2026-07-23 17:20:51.000000',1,'f8df858e7467444fab6ac1b0807ef696'),(32,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDgyNzM2MCwiaWF0IjoxNzg0MjIyNTYwLCJqdGkiOiIzM2MwYjgwMTBiZTg0NDIzYTIzOTQyZDUwMTVkY2JjOCIsInVzZXJfaWQiOjV9.aQ5kHzL0hqDExvWX8-jil_acXluem3TxzT-YEt1adig','2026-07-16 17:22:40.589450','2026-07-23 17:22:40.000000',5,'33c0b8010be84423a23942d5015dcbc8'),(33,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDgyODIzNywiaWF0IjoxNzg0MjIzNDM3LCJqdGkiOiJlZjU4OGNhODFiNzA0YTg3YmY0MGNmZTc5NTFjZmFiYyIsInVzZXJfaWQiOjF9.V3mqyfPi0k-15LEkciT2poyDPMCKC7negE75ZebuS7c','2026-07-16 17:37:17.079346','2026-07-23 17:37:17.000000',1,'ef588ca81b704a87bf40cfe7951cfabc'),(34,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDgyODYwNSwiaWF0IjoxNzg0MjIzODA1LCJqdGkiOiIyNTVhMGRhM2NmNjA0NmJiYjU5ZDczNjdkZGE0NTJjMSIsInVzZXJfaWQiOjF9.qCsgD5Z_6HnHou50p4iwcjzMBcn5eq_nlalChIy2zrs','2026-07-16 17:43:25.534848','2026-07-23 17:43:25.000000',1,'255a0da3cf6046bbb59d7367dda452c1'),(35,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDgyODY5MCwiaWF0IjoxNzg0MjIzODkwLCJqdGkiOiIxYzRiMzBmMWJkZTE0NjdlOTMyYWQ3Y2UyODZkMWMzZiIsInVzZXJfaWQiOjF9.OblhGKAHNlCfhxPwQ57m0JYjXdPkGi4B-1lwl-kDfoc','2026-07-16 17:44:50.196195','2026-07-23 17:44:50.000000',1,'1c4b30f1bde1467e932ad7ce286d1c3f'),(36,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDgyODg2NywiaWF0IjoxNzg0MjI0MDY3LCJqdGkiOiI1Yjk3N2VkOWQ5N2M0MjhjODFkNGMyY2ZmMWY4ZDNkYSIsInVzZXJfaWQiOjJ9.FQbgvQvZiexo8ELP20YV6lHGiim-wuWGECtfdFMjP-E','2026-07-16 17:47:47.950951','2026-07-23 17:47:47.000000',2,'5b977ed9d97c428c81d4c2cff1f8d3da'),(37,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDgyODkwNywiaWF0IjoxNzg0MjI0MTA3LCJqdGkiOiI1ZmNmMzI5MjA1NTY0MTRjOWYwYWQzNGEzNWI0ZjZlMSIsInVzZXJfaWQiOjF9.sHmlTYKzX9sOSM4qVaLHvMQ40vG2TpAHs-T1LUsh1Kc','2026-07-16 17:48:27.993055','2026-07-23 17:48:27.000000',1,'5fcf32920556414c9f0ad34a35b4f6e1'),(38,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDgzMDMyNCwiaWF0IjoxNzg0MjI1NTI0LCJqdGkiOiIwOWFmYTg1OWMxNzg0OWZlYWI2YzcxMDlhZDlkZGM0NiIsInVzZXJfaWQiOjF9.Q2E3VzlGmAuo5YQQwIs6nDsSqPnovbQsJ6KxoMp6QnI','2026-07-16 18:12:04.290530','2026-07-23 18:12:04.000000',1,'09afa859c17849feab6c7109ad9ddc46'),(39,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NDgzMDgwNCwiaWF0IjoxNzg0MjI2MDA0LCJqdGkiOiJmZjM3NWE5NDkwMmY0ZjY5YThhNjY3OTg0OWNlMmNiMiIsInVzZXJfaWQiOjF9.AiNQoGp4u4fc2ZXM0leqAYge90r8yEuh15zA_CxD2f0','2026-07-16 18:20:04.801337','2026-07-23 18:20:04.000000',1,'ff375a94902f4f69a8a6679849ce2cb2');
/*!40000 ALTER TABLE `token_blacklist_outstandingtoken` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_clienteprofile`
--

DROP TABLE IF EXISTS `users_clienteprofile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_clienteprofile` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `empresa` varchar(50) NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `users_clienteprofile_user_id_822b83a8_fk_users_customuser_id` FOREIGN KEY (`user_id`) REFERENCES `users_customuser` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_clienteprofile`
--

LOCK TABLES `users_clienteprofile` WRITE;
/*!40000 ALTER TABLE `users_clienteprofile` DISABLE KEYS */;
/*!40000 ALTER TABLE `users_clienteprofile` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_customuser`
--

DROP TABLE IF EXISTS `users_customuser`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_customuser` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `password` varchar(128) NOT NULL,
  `last_login` datetime(6) DEFAULT NULL,
  `is_superuser` tinyint(1) NOT NULL,
  `username` varchar(150) NOT NULL,
  `email` varchar(254) NOT NULL,
  `is_staff` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `date_joined` datetime(6) NOT NULL,
  `dni` bigint NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `sexo` varchar(1) NOT NULL,
  `tipo` varchar(10) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `dni` (`dni`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_customuser`
--

LOCK TABLES `users_customuser` WRITE;
/*!40000 ALTER TABLE `users_customuser` DISABLE KEYS */;
INSERT INTO `users_customuser` VALUES (1,'pbkdf2_sha256$600000$2M7mCZnfsNkEW784rAghvH$Sss56WJZsRBAd9r6yT93N+TMKpPAlgqyXAGJyTH9uPU=',NULL,0,'48464317','admin@local.test',0,1,'2026-07-08 17:47:14.437356',48464317,'santiago','buhler','M','ADMIN'),(2,'pbkdf2_sha256$600000$crSLIST07MGJYHf0xvNUv5$0IhA/RnkMY3U5WDcNrZFrItLaFD2cWPLYyF7fP1Hm24=',NULL,0,'47568547','mirko@gmail.com',0,1,'2026-07-08 17:47:45.191861',47568547,'Mirko','Diosquez','M','EMPLEADO'),(3,'pbkdf2_sha256$600000$o0ADVEwgU3HmW6z9KeZvRT$VON2NCAg4IoVZQdWfBICC4UVKxe7SsrTDGeqjOS5Hlc=',NULL,0,'86325452','matias@gmail.com',0,1,'2026-07-08 19:37:33.777571',86325452,'fede','martinez','M','EMPLEADO'),(5,'pbkdf2_sha256$600000$IrrWdXyCujliqcQ1bRiRAz$U+DHzNKJZDsqxf4Uz7kH8na9k7TQkUnKrFiu3/vHYfs=',NULL,0,'25538192','ngayubas@daltectools.com',0,1,'2026-07-16 17:22:28.180140',25538192,'Nicolas','Gayubas','M','EMPLEADO');
/*!40000 ALTER TABLE `users_customuser` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_customuser_groups`
--

DROP TABLE IF EXISTS `users_customuser_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_customuser_groups` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `customuser_id` bigint NOT NULL,
  `group_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_customuser_groups_customuser_id_group_id_76b619e3_uniq` (`customuser_id`,`group_id`),
  KEY `users_customuser_groups_group_id_01390b14_fk_auth_group_id` (`group_id`),
  CONSTRAINT `users_customuser_gro_customuser_id_958147bf_fk_users_cus` FOREIGN KEY (`customuser_id`) REFERENCES `users_customuser` (`id`),
  CONSTRAINT `users_customuser_groups_group_id_01390b14_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_customuser_groups`
--

LOCK TABLES `users_customuser_groups` WRITE;
/*!40000 ALTER TABLE `users_customuser_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `users_customuser_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_customuser_user_permissions`
--

DROP TABLE IF EXISTS `users_customuser_user_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_customuser_user_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `customuser_id` bigint NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_customuser_user_pe_customuser_id_permission_7a7debf6_uniq` (`customuser_id`,`permission_id`),
  KEY `users_customuser_use_permission_id_baaa2f74_fk_auth_perm` (`permission_id`),
  CONSTRAINT `users_customuser_use_customuser_id_5771478b_fk_users_cus` FOREIGN KEY (`customuser_id`) REFERENCES `users_customuser` (`id`),
  CONSTRAINT `users_customuser_use_permission_id_baaa2f74_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_customuser_user_permissions`
--

LOCK TABLES `users_customuser_user_permissions` WRITE;
/*!40000 ALTER TABLE `users_customuser_user_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `users_customuser_user_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_empleadoprofile`
--

DROP TABLE IF EXISTS `users_empleadoprofile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_empleadoprofile` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `sector` varchar(100) NOT NULL,
  `user_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `users_empleadoprofile_user_id_0acc8b8b_fk_users_customuser_id` FOREIGN KEY (`user_id`) REFERENCES `users_customuser` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_empleadoprofile`
--

LOCK TABLES `users_empleadoprofile` WRITE;
/*!40000 ALTER TABLE `users_empleadoprofile` DISABLE KEYS */;
INSERT INTO `users_empleadoprofile` VALUES (1,'INGENIERIA',2),(2,'administracion',3),(3,'PRODUCCION',5);
/*!40000 ALTER TABLE `users_empleadoprofile` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-16 18:27:45
