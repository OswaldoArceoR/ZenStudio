<?php
session_start();
session_destroy();

header("Location: inicioSesion.php");
exit();
?>