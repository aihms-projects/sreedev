<?php
declare(strict_types=1);require __DIR__.'/common.php';
if($_SERVER['REQUEST_METHOD']!=='POST')fail(405,'Method not allowed.');
$input=json_decode(file_get_contents('php://input'),true);if(!is_array($input))fail(400,'Invalid JSON request.');
function field(array $input,string $name,int $max): string { $v=trim((string)($input[$name]??''));if($v===''||mb_strlen($v)>$max)fail(422,'Invalid '.$name.'.');return $v;}
$amount=filter_var($input['amount']??null,FILTER_VALIDATE_FLOAT);if($amount===false||$amount<1||$amount>1000000)fail(422,'Invalid amount.');
$org=field($input,'organisation',120);$address=field($input,'full_address',500);$city=field($input,'city',80);$state=field($input,'state',80);$pin=field($input,'pincode',6);$email=field($input,'email',180);$phone=field($input,'phone',10);
if(!preg_match('/^[0-9]{6}$/',$pin)||!filter_var($email,FILTER_VALIDATE_EMAIL)||!preg_match('/^[6-9][0-9]{9}$/',$phone))fail(422,'Invalid customer contact or pincode.');
if(empty($input['agree']))fail(422,'Please accept the policies.');
$ref=trim((string)($input['reference']??''));if(mb_strlen($ref)>80)fail(422,'Invalid reference.');
$orderId='SD'.date('ymd').strtoupper(bin2hex(random_bytes(7)));
$site=rtrim((string)$config['site_url'],'/');if(!preg_match('~^https://[^/]+$~',$site))fail(503,'Invalid payment site URL.');
$payload=['order_id'=>$orderId,'order_amount'=>round((float)$amount,2),'order_currency'=>'INR','customer_details'=>['customer_id'=>'SDC'.bin2hex(random_bytes(6)),'customer_name'=>$org,'customer_email'=>$email,'customer_phone'=>$phone],'order_meta'=>['return_url'=>$site.'/payment.html?order_id={order_id}'],'order_note'=>mb_substr('Reference: '.$ref.'; Address: '.$address.', '.$city.', '.$state.' - '.$pin,0,250)];
$result=cashfreeRequest('POST','/orders',$payload);
if(empty($result['payment_session_id']))fail(502,'Payment session unavailable.');
echo json_encode(['order_id'=>$orderId,'payment_session_id'=>$result['payment_session_id'],'mode'=>$config['environment']]);
