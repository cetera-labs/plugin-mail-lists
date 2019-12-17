<?php
include('common_bo.php');

if (count($_POST)) 
	foreach ($_POST as $name => $value)
		\MailLists\Settings::configSet( $name, $value );

echo json_encode(\MailLists\Settings::configGetAll());