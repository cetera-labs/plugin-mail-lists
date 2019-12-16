<?php
/************************************************************************************************

Список материалов

*************************************************************************************************/

include_once('common_bo.php');
include('common_ml.php');

$data = array(
    array('id' => FILTER_ALL_USERS, 'name' => $translator->_('Все пользователи')),
    array('id' => FILTER_BO_USERS, 'name' => $translator->_('Пользователи Backoffice')),
);

$r = $application->getConn()->executeQuery('SELECT * FROM mail_lists_user_filters ORDER BY name');
while ($f = $r->fetch()) $data[] = $f;

echo json_encode(array(
    'success' => true,
    'rows'    => $data
));