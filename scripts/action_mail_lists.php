<?php
/**
 * Cetera CMS 3 
 * 
 * AJAX-backend действия с форумами
 *
 * @package CeteraCMS
 * @version $Id$
 * @copyright 2000-2010 Cetera labs (http://www.cetera.ru) 
 * @author Roman Romanov <nicodim@mail.ru> 
 **/
  
include_once('common_bo.php');

$res = array(
    'success' => false,
    'errors'  => array()
);


$action = $_POST['action'];
$sel = $_POST['sel'];
$id = (int)$_POST['id'];

if ($action == 'save_filter') {
    if (!$user->allowAdmin()) return; 
    test_filter($_POST['sql']);
    
    $sql = 'mail_lists_user_filters SET name=?, `sql`=?';
    if ($_POST['id'])
        $sql = 'UPDATE '.$sql.' WHERE id='.(int)$_POST['id'];
        else $sql = 'INSERT INTO '.$sql;
	
	$application->getConn()->executeQuery($sql, array($_POST['name'], $_POST['sql']));
    
    $res['success'] = true; 
}

if ($action == 'test_filter') {
    if (!$user->allowAdmin()) return; 
    $res['count'] = test_filter($_POST['sql']);
    $res['success'] = true; 
}

if ($action == 'delete_filter') {
    if (!$user->allowAdmin()) return; 
    $application->getConn()->executeQuery('DELETE FROM mail_lists_user_filters WHERE id='.(int)$_POST['id']);
    $res['success'] = true; 
}

function test_filter($sql) {
	$application = \Cetera\Application::getInstance();
    $application->getConn()->executeQuery('SELECT SQL_CALC_FOUND_ROWS '.$sql);
    return $application->getConn()->fetchColumn('SELECT FOUND_ROWS()');
}

if ($action == 'set_history') {
    $res['historyId'] = form_list(0, 'text/html', $_POST['from'], $_POST['subject'], $_POST['body'], MAIL_LIST_FORMED, $_POST['filter']);
    $res['success'] = true; 
}

if ($action == 'get_history') {
    $res['data'] =  $application->getConn()->fetchAssoc('SELECT * FROM mail_lists_history WHERE id='.$id);
    $res['data']['id_history'] = $res['data']['id'];
    $res['success'] = true;
}

if ($action == 'clear_history') {
    $application->getConn()->executeQuery("TRUNCATE TABLE mail_lists_history");
    $res['success'] = true;
}

if ($action == 'delete_history') {
    $application->getConn()->executeQuery('DELETE FROM mail_lists_history WHERE id='.$id);
    $res['success'] = true;
}

if ($action == 'send_list') {

    $f = $application->getConn()->fetchAssoc("select * from mail_lists_history where id=$id");
    $code = 0;
    $progress = 0;
    
    if (!$f) {
        $code = MAIL_NOTHING_TO_SEND;
        $msg = $translator->_('Рассылка не существует');
    } else {
        if ($f['state'] == MAIL_LIST_DONE) {
            $code = MAIL_NOTHING_TO_SEND;
            $msg = $translator->_('Рассылка окончена');   
        }
    }
    
    if (!$code) {

        $r = false;

        if ($f['list_id']) {
        
            $r = $application->getConn()->executeQuery("
            	SELECT SQL_CALC_FOUND_ROWS A.* 
            	FROM users A, mail_lists_users B 
            	WHERE A.id=B.iduser and B.idlist=".$f['list_id']." 
            	LIMIT ".$f['counter'].",".MAX_RCPTS);
              
        } 
        elseif ($f['filter']) {
            
            $sql = '';
            switch ($f['filter']) {
                case FILTER_ALL_USERS:
                    $sql = 'A.* FROM users A WHERE disabled=0 and email IS NOT NULL and email <> ""';
                    break;
                case FILTER_BO_USERS:
                    $sql = 'A.* FROM users A LEFT JOIN users_groups_membership B ON (A.id = B.user_id) WHERE  (A.id = 1 or B.group_id='.GROUP_BACKOFFICE.' or B.group_id='.GROUP_ADMIN.') and disabled=0 and email IS NOT NULL and email <> ""';
                    break;            
            }
            
            $r = $application->getConn()->executeQuery("SELECT SQL_CALC_FOUND_ROWS ".$sql." LIMIT ".$f['counter'].",".MAX_RCPTS);           
        
        }
          
        $allcount = $application->getConn()->fetchColumn("SELECT FOUND_ROWS()");
        
        if (!$r->rowCount()) {
        	$application->getConn()->executeQuery("UPDATE mail_lists_history SET state=".MAIL_LIST_DONE.", counter=0, percent=100 where id=$id");
            $code = MAIL_NOTHING_TO_SEND;
            if ($f['counter'] > 0)
                $msg = $translator->_('Рассылка окончена');
                else $msg = $translator->_('Рассылка невозможна. Нет пользователей.');   
        } 
		else {
        	$application->getConn()->executeQuery("UPDATE mail_lists_history SET state=".MAIL_LIST_SENDING." where id=$id");
        	$mails = array();
            while ( $g = $r->fetch() ) $mails[] = $g;
            do_send($id, $mails, $f['contenttype'], $f['sender'], $f['subject'], $f['body'],$f['list_id']);
            $progress = ($f['counter']+sizeof($mails))/$allcount;
            $percent = (int)(100*$progress);
            $application->getConn()->executeQuery('UPDATE mail_lists_history SET state='.MAIL_LIST_PAUSED.', send_date=NOW(), percent='.$percent.' WHERE id='.$id);
            $msg = sprintf($translator->_('Разослано %s писем из %s (%s%%)'),$f['counter']+sizeof($mails),$allcount,$percent);
            $code = MAIL_SEND_OK;
        }
    }

    $res['data'] = array(
        'code'     => $code,
        'progress' => $progress,
        'msg'      => $msg
    );
    $res['success'] = true;
}

if ($action == 'test_send') {
    $to = array();
    foreach (explode(',', $_REQUEST['email']) as $m) $to[] = array('email' => $m);
    $f = $application->getConn()->fetchAssoc ("select * from mail_lists_history where id=$id");
    if (!$f) {
        $f = array(
            'contenttype' => 'text/html',
            'sender' => 'test@cetera.ru'
        );
    }
    $res = do_send(0, $to, $f['contenttype'], $f['sender'], $_POST['subject'], $_POST['body'], $f['list_id']);
    $res['success'] = true;
}

if ($action == 'update_history') {
	$application->getConn()->executeQuery('UPDATE mail_lists_history SET subject=?, body=? WHERE id=?', array($_POST['subject'], $_POST['body'], $id));
    $res['success'] = true;
}

if ($action == 'set_status') {
	$application->getConn()->executeQuery('UPDATE mail_lists_history SET state='.(int)$_POST['status'].' WHERE id='.$id);
    $res['success'] = true;
}

if ($action == 'form_list') {

    $f = $application->getConn()->fetchAssoc("SELECT * FROM mail_lists WHERE id=$id");

    $twig = new \Twig_Environment(
        new \Twig_Loader_Array( $f ),
        array(
            'autoescape' => false,
        )
    );    

  	if (isset($_POST['materials'])) {
  	
  		$materials = array();
  		$allcount = 0;
		$mtrls = explode(';',$_POST['materials']);
  	
  		foreach($mtrls as $mat) if ($mat) {
  		    list($table, $mid) = explode(',', $mat);
    			$material = \Cetera\Material::getById($mid, 0, $table);
    			if ($material) {
                    $materials[] = $material;
                    $application->getConn()->executeQuery("update $table set type=type|".MATH_SEND." where id=".$material->id);
                }
    		  }
  	
  	} else {
  	
  		$materials = get_materials($id, $f['material_where']);
  		$allcount = sizeof($materials);
  
  	}
    
    $params = [
        'materials' => $materials,
        'application' => $application,
        'newsletter' => \MailLists\Newsletter::getById($f['id']),
    ];
  	
  	$subject = $twig->render('subject', $params);
  	$body = $twig->render('body', $params);

    $id_history = form_list($id, $f['contenttype'], $f['sender'], $subject, $body, MAIL_LIST_FORMED);
    
    $res['data'] = array(
        'id_history' => $id_history,
        'subject'    => $subject,
        'body'       => $body,
        'is_html'    => strpos($f['contenttype'], 'html')
    );

    $res['success'] = true;
    
}

if ($action == 'delete_list') {

    $application->getConn()->executeQuery("delete from mail_lists where id=$id");
	$application->getConn()->executeQuery("delete from mail_lists_users where idlist=$id");
	$application->getConn()->executeQuery("delete from mail_lists_history where list_id=$id");
	$res['success'] = true;

}

if ($action == 'unsubscribe_all') {

	$application->getConn()->executeQuery("delete from mail_lists_users where idlist=$id");
	$res['success'] = true;

}

if ($action == 'subscribe_all') {

	$application->getConn()->executeQuery("delete from mail_lists_users where idlist=$id");
    $application->getConn()->executeQuery('INSERT INTO mail_lists_users (idlist,iduser) SELECT '.$id.', id FROM users');
  
	$res['success'] = true;

}

if ($action == 'save_list') {

    $r  = $application->getConn()->executeQuery("select id from mail_lists where (name=?)and(id <> ?)", array($_POST['name'],$id));
    if ($r->rowCount()) throw new Exception_Form($translator->_('Рассылка с таким именем уже существует'), 'name');

    if ($id) {
        $application->getConn()->executeQuery("delete from mail_lists_users where idlist=$id and iduser IN (".$_POST['unsubscribe'].")");
    }
    
    $users = explode(',',$_POST['subscribe']);
	foreach ($users as $user) if ($user) 
		$application->getConn()->executeQuery("insert into mail_lists_users (idlist,iduser) values ($id,$user)");
		
	$schedule = (int)$_POST['schedule'];
	$schedule_period = (int)$_POST['schedule_period'];
	if ($schedule == MAIL_LIST_SCD_WEEK) {
	   $schedule_period = 0;
	   for ($i = 0; $i < 7; $i++) if (isset($_POST['d'.$i])) $schedule_period += $_POST['d'.$i];
	}
	
	
	
	$query = 'mail_lists SET material_where=?, name=?, describ=?, subject=?, body=?, sender=?, contenttype=?, schedule=?, schedule_period=?';
        
    if ($id) $query = 'UPDATE '.$query.' WHERE id='.$id;
        else $query = 'INSERT INTO '.$query;
    
    $application->getConn()->executeQuery($query, array($_POST['material_where'],$_POST['name'],$_POST['describ'],$_POST['subject'],$_POST['body'],$_POST['sender'],$_POST['contenttype'],$schedule,$schedule_period));
    if (!$id) $id = $application->getConn()->lastInsertId();
    
    if (isset($_POST['catalogs']) && is_array($_POST['catalogs']) && $id) {
        $application->getConn()->executeQuery('DELETE FROM mail_lists_dirs WHERE idlist='.(int)$id);
        foreach($_POST['catalogs'] as $cid) {
            $application->getConn()->executeQuery('INSERT INTO mail_lists_dirs SET idlist='.(int)$id.', idcat='.(int)$cid);
        }
    }
        
    $res['success'] = true;
}

if ($action == 'get_list') {

    $res['data'] = $application->getConn()->fetchAssoc('SELECT * FROM mail_lists WHERE id='.(int)$_REQUEST['id']);
    $res['success'] = true;
    
}

echo json_encode($res);