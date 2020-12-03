<?php
/**
 * 
 *
 * @version $Id: config.php,v 1.2 2006/04/15 09:16:17 cetera Exp $
 * @copyright 2005 
 **/
 
use PHPMailer\PHPMailer\PHPMailer;

define ('MAIL_LIST_FORMED', 1);
define ('MAIL_LIST_SCHEDULED', 2);
define ('MAIL_LIST_SENDING', 3);
define ('MAIL_LIST_DONE', 4);
define ('MAIL_LIST_PAUSED', 5);
define ('MAIL_LIST_CANCELED', 6);

define ('MAIL_LIST_SCD_OFF', 0);
define ('MAIL_LIST_SCD_DAY', 1);
define ('MAIL_LIST_SCD_WEEK', 2);
define ('MAIL_LIST_SCD_MONTH', 3);

DEFINE('MAX_RCPTS', 10);

define('MAIL_SEND_OK', 1);
define('MAIL_NOTHING_TO_SEND', 2);
define('MAIL_ERROR', 3);

define('FILTER_ALL_USERS', -1);
define('FILTER_BO_USERS', -2);

function form_list($id, $contenttype, $sender, $subject, $body, $state = MAIL_LIST_FORMED, $filter = 0) {
	$application = \Cetera\Application::getInstance();	
	$application->getConn()->executeQuery('INSERT INTO mail_lists_history SET filter=?, state=?, list_id=?, form_date=NOW(), sender=?, contenttype=?, subject=?, body=?', array($filter,$state,(int)$id, $sender, $contenttype,$subject,$body));
	return $application->getConn()->lastInsertId();
}

// получить список материалов для рассылки
function get_materials($id, $material_where) {
	$application = \Cetera\Application::getInstance();
	
		$materials = array();
		$allcount = 0;
		
		  if ($material_where) {
		    $math_where = '('.$material_where.') and ';  
		  } else {
		  	$math_where = '';
		  }
	
		// Цикл по разделам
		$r = $application->getConn()->executeQuery("select idcat from mail_lists_dirs where idlist=$id");
		while ($f = $r->fetch()) {
		
		  $idcat = $f['idcat'];
		  
		  $c = \Cetera\Catalog::getById($idcat);
		  $list = $c->getMaterials()->select('*')->where("type&".MATH_SEND."=0")->orderBy('dat','ASC')->setItemCountPerPage(50);
		  	 
		  // цикл по материалам	
		  foreach ($list as $material) {
              $materials[] = $material;
		  }

		  $application->getConn()->executeQuery("update ".$c->getMaterialsTable()." set type=type|".MATH_SEND." where type&".MATH_PUBLISHED."=1 and type&".MATH_SEND."=0 and idcat=$idcat");
		}

	return $materials;
		
}

function do_send($history_id, &$mails, $content_type, $from, $subject, $body, $list_id) {
	$application = \Cetera\Application::getInstance();

  	reset($mails);
    
    $fromname = '';
    $fromemail = $from;
  
    preg_match('/<(.*)>/U',$from, $m);
	
	$body = preg_replace('/src=\"\//U','src="http://'.getenv('SERVER_NAME').'/',$body);
    
    if (sizeof($m)) {
        $fromemail = $m[1];
        $fromname = str_replace($m[0],'',$from);
    }
    
    if (is_dir(DOCROOT.'../logs') && is_writable(DOCROOT.'../logs')) {
        $log = fopen(DOCROOT.'../logs/mail_'.date('Y_m_d').'.log', 'a');
    }
  
  	foreach ($mails as $to) {
  				
      if (trim($to['email'])) {	
  
          try {              
          	$bodye = $body;
          	foreach ($to as $name=>$value) $bodye = str_replace('{user_'.$name.'}', $value, $bodye);
            
            $unsubscribe_link = false;
			if ($to['id']) {
				$unsubscribe_link = \Cetera\Server::getDefault()->getFullUrl().'plugins/mail-lists/scripts/unsubscribe.php?uid='.$to['id'].'&lid='.$list_id;
				$bodye = str_replace('{unsubscribe_link}', $unsubscribe_link, $bodye);
            }
            
            if (\MailLists\Settings::configGet( 'mailer' ) == 'sengrid') {
                
                $email = new \SendGrid\Mail\Mail(); 
                if ($fromemail) {
                    $email->setFrom($fromemail, $fromname);
                }
                if ($unsubscribe_link) {
                    $email->addHeader('List-Unsubscribe', $unsubscribe_link);
                }                
                $email->setSubject($subject);
                $email->addTo(strtolower($to['email']));
                $email->addContent($content_type, $bodye);
                $sendgrid = new \SendGrid( \MailLists\Settings::configGet( 'sengrid_api_key' ) );
                $response = $sendgrid->send($email);
    print $response->statusCode() . "\n";
    print_r($response->headers());
    print $response->body() . "\n";                
                if ($response->statusCode()>=400) {
                    throw new \Exception( $response->body() );
                }
            }
            else {
                $mail = new PHPMailer(true);
                if ($unsubscribe_link) {
                    $mail->AddCustomHeader('List-Unsubscribe: <'.$unsubscribe_link.'>');
                }
                $mail->ContentType=$content_type;       
                if ($fromemail) $mail->SetFrom($fromemail, $fromname);
                $mail->CharSet = 'utf-8';
                $mail->Subject = $subject;            
                $mail->AddAddress(strtolower($to['email']));
                $mail->Body = $bodye;
                $mail->Send();
            }
            
            if ($log) fwrite($log, $to['email']." - OK\n");
          } catch (Exception $e) {
              if ($log)
                  fwrite($log, $to['email']." - FAIL\n\n".var_export($e, true)."\n\n");
          }
      }
  		if ($history_id) $application->getConn()->executeQuery('UPDATE mail_lists_history SET counter=counter+1 WHERE id='.$history_id);
  	}
    
    if ($log) fclose($log);
  	
}