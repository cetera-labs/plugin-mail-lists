<?php
/************************************************************************************************

Список материалов

*************************************************************************************************/

include_once('common_bo.php');
include('common_ml.php');

$mail_state = array(
	MAIL_LIST_FORMED => $translator->_('Рассылка сформирована (отложена)'),
	MAIL_LIST_SCHEDULED => $translator->_('Рассылка запланирована'),
	MAIL_LIST_SENDING => $translator->_('Идет рассылка'),
	MAIL_LIST_DONE => $translator->_('Рассылка окончена'),
	MAIL_LIST_PAUSED => $translator->_('Рассылка приостановлена'),
	MAIL_LIST_CANCELED => $translator->_('Рассылка отменена пользователем')
);

$data = array();

if (!isset($_REQUEST['start'])) $_REQUEST['start'] = 0;

$list_id = (int)$_REQUEST['id'];

$r = $application->getConn()->executeQuery('SELECT SQL_CALC_FOUND_ROWS * from mail_lists_history WHERE list_id='.$list_id.' ORDER BY form_date DESC LIMIT '.(int)$_REQUEST['start'].','.(int)$_REQUEST['limit']);

while ( $f = $r->fetch() ) {
  $state = $mail_state[$f['state']];
  if ($f['state'] == MAIL_LIST_PAUSED || $f['state'] == MAIL_LIST_SENDING) 
      $state .= ' ('.$f['percent'].'%)';
  $f['state_text'] = $state;
  $data[] = $f;
}

echo json_encode(array(
    'success' => true,
    'total'   => $application->getConn()->fetchColumn('SELECT FOUND_ROWS()'),
    'rows'    => $data
));
?>
