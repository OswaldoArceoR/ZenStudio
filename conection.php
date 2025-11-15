<?php
//Conxexion a la base de datos modificar para el hosting
$servername = "localhost";
$usename = "root";
$password = "";
$database ="zenstudio"; //Nombre provisional xd

//mostrar errores de mysql
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
try {
    $conexion = mysqli_connect($servername, $usename, $password, $database);
    $conexion->set_charset("utf8mb4");
} catch (Exception $exception) {
    //lo mostramos en pantalla para nosotros, eliminar cuando se suba
    die("Error al conectar a la base de datos: " . $exception->getMessage());
}


?>

