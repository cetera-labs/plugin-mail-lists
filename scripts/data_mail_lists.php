<?php
/************************************************************************************************

Список материалов

*************************************************************************************************/

include_once('common_bo.php');

$data = array();

if (!isset($_REQUEST['sort'])) $_REQUEST['sort'] = 'name';
if (!isset($_REQUEST['dir'])) $_REQUEST['dir'] = 'ASC';

$r = $application->getConn()->executeQuery('SELECT id,name, describ FROM mail_lists ORDER BY '.$_REQUEST['sort'].' '.$_REQUEST['dir']);
while ( $f = $r->fetch() ) $data[] = $f;

echo json_encode(array(
    'success' => true,
    'rows'    => $data
));
