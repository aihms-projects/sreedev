<?php
declare(strict_types=1);require __DIR__.'/common.php';
if($_SERVER['REQUEST_METHOD']!=='GET')fail(405,'Method not allowed.');
$id=(string)($_GET['order_id']??'');if(!preg_match('/^SD[0-9]{6}[A-F0-9]{14}$/',$id))fail(422,'Invalid order ID.');
$result=cashfreeRequest('GET','/orders/'.rawurlencode($id));
echo json_encode(['order_id'=>$id,'order_status'=>$result['order_status']??'UNKNOWN']);
