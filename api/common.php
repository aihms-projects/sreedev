<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
function fail(int $status, string $message): never {http_response_code($status);echo json_encode(['error'=>$message]);exit;}
$configFile=__DIR__.'/config.php';if(!is_file($configFile))fail(503,'Payment service is not configured.');
$config=require $configFile;
if(!is_array($config)||empty($config['client_id'])||empty($config['client_secret'])||!in_array($config['environment']??'', ['sandbox','production'],true))fail(503,'Payment service configuration error.');
$base=$config['environment']==='production'?'https://api.cashfree.com/pg':'https://sandbox.cashfree.com/pg';
function cashfreeRequest(string $method,string $path,?array $payload=null): array {global $base,$config;
 $ch=curl_init($base.$path);$headers=['x-client-id: '.$config['client_id'],'x-client-secret: '.$config['client_secret'],'x-api-version: 2023-08-01','Accept: application/json'];
 if($payload!==null){$headers[]='Content-Type: application/json';curl_setopt($ch,CURLOPT_POSTFIELDS,json_encode($payload,JSON_UNESCAPED_SLASHES));}
 curl_setopt_array($ch,[CURLOPT_CUSTOMREQUEST=>$method,CURLOPT_HTTPHEADER=>$headers,CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>20,CURLOPT_SSL_VERIFYPEER=>true]);
 $raw=curl_exec($ch);$status=curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
 if($raw===false||$status<200||$status>=300){error_log('Cashfree API HTTP '.$status.' response: '.substr((string)$raw,0,500));fail(502,'Payment provider could not process the request.');}
 $data=json_decode((string)$raw,true);if(!is_array($data))fail(502,'Invalid payment provider response.');return $data;
}
