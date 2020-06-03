<?php
$application->connectDb();

print "Mail lists\n";
 
$r = $application->getConn()->executeQuery('SELECT *, UNIX_TIMESTAMP(schedule_lastrun) as lastrun, DATEDIFF(NOW(),schedule_lastrun) as diff FROM mail_lists WHERE schedule>0 and DATEDIFF(NOW(),schedule_lastrun)>0');
while($f = $r->fetch()) {

	print '  "'.$f['name'].'" ';

	if ($f['schedule'] ==MAIL_LIST_SCD_DAY) {
			if ($f['diff'] < $f['schedule_period']) { print "skipped (no date match)\n"; continue;}
	} elseif ($f['schedule'] == MAIL_LIST_SCD_WEEK) {
			$w = date('w')-1;
			if ($w<0) $w = 6;
			$w = pow(2,$w);
			if (!($f['schedule_period']&$w)) { print "skipped (no date match)\n"; continue;}
	} elseif ($f['schedule'] == MAIL_LIST_SCD_MONTH) {
			if (date('j')!=$f['schedule_period']) { print "skipped (no date match)\n"; continue;}
	}
	
	$c = $application->getConn()->fetchColumn('SELECT COUNT(*) FROM mail_lists_history WHERE state='.MAIL_LIST_SENDING.' and list_id='.$f['id']);
	if ($c) { print "skipped (in progress)\n"; continue;} // рассылка в процессе
	
	$r2 = $application->getConn()->executeQuery("
		SELECT A.* 
		FROM users A, mail_lists_users B 
		WHERE A.id=B.iduser and B.idlist=".$f['id'].'
		GROUP BY A.email
		');
	if (!$r2->rowCount()) { print "skipped (no subscribed users)\n"; continue;} // нет подписанных пользователей
	
	$mails = array();
	while ($g = $r2->fetch()) $mails[] = $g;
	
	$materials = get_materials($f['id'], $f['material_where'], TRUE);
	if (!sizeof($materials)) { print "skipped (no materials)\n"; continue;} // нет материалов для рассылки
	
	print "sending ".sizeof($materials)." materials to ".sizeof($mails)." users ... ";
	
    $twig = new \Twig_Environment(
        new \Twig_Loader_Array( $f ),
        array(
            'autoescape' => false,
        )
    );
	
    $params = [
        'materials' => $materials,
        'application' => $application,
        'newsletter' => \MailLists\Newsletter::getById($f['id']),
    ];
  	
  	$subject = $twig->render('subject', $params);
  	$body = $twig->render('body', $params);
	
	$id_history = form_list($f['id'], $f['contenttype'], $f['sender'], $subject, $body, MAIL_LIST_SENDING);

	do_send($id_history, $mails, $f['contenttype'], $f['sender'], $subject, $body, $f['id']);
	$application->getConn()->executeQuery("UPDATE mail_lists_history SET state=".MAIL_LIST_DONE.", send_date=NOW(), counter=0, percent=100 where id=$id_history");
	$application->getConn()->executeQuery('UPDATE mail_lists SET schedule_lastrun=NOW() WHERE id='.$f['id']);
	print "ok\n";
} // while
