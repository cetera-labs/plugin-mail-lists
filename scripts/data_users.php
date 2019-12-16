<?php
/************************************************************************************************

Список материалов

*************************************************************************************************/

include_once('common_bo.php');

$data = array();

if (!isset($_REQUEST['sort'])) {
    $_REQUEST['sort'] = 'login';
    $_REQUEST['dir'] = 'ASC';
}

if (!isset($_REQUEST['start'])) $_REQUEST['start'] = 0;

$list_id = $_REQUEST['id'];

$query = '
    SELECT COUNT(DISTINCT A.id), SUM(IF(LENGTH(A.email)>3,1,0))
    FROM users A 
    LEFT JOIN users_groups_membership B ON (A.id = B.user_id)
    INNER JOIN mail_lists_users C ON (A.id=C.iduser and C.idlist='.$list_id.')
    WHERE A.id<>0'
        .(($_REQUEST['bo']=='true')?' and (A.id = 1 or B.group_id='.GROUP_BACKOFFICE.' or B.group_id='.GROUP_ADMIN.')':'')
        .((isset($_REQUEST['query']) && $_REQUEST['query'])?' and A.login LIKE "%'.$_REQUEST['query'].'%" or A.name LIKE "%'.$_REQUEST['query'].'%"':'');
$r = $application->getConn()->fetchArray($query);
$checked = $r[0];
$checked2 = $r[1];

if (isset($_REQUEST['filter']) && $_REQUEST['filter']) $join = 'INNER'; else $join = 'LEFT';

$query = '
    SELECT SQL_CALC_FOUND_ROWS A.id, A.login, A.name, A.disabled, 
    SUM(IF(B.group_id='.GROUP_BACKOFFICE.' or B.group_id='.GROUP_ADMIN.' or A.id=1,1,0)) as bo, 
    COUNT(C.idlist) as checked
    FROM users A 
    LEFT JOIN users_groups_membership B ON (A.id = B.user_id)
    '.$join.' JOIN mail_lists_users C ON (A.id=C.iduser and C.idlist='.$list_id.')
    WHERE A.id<>0'
        .(($_REQUEST['bo']=='true')?' and (A.id = 1 or B.group_id='.GROUP_BACKOFFICE.' or B.group_id='.GROUP_ADMIN.')':'')
        .((isset($_REQUEST['query']) && $_REQUEST['query'])?' and A.login LIKE "%'.$_REQUEST['query'].'%" or A.name LIKE "%'.$_REQUEST['query'].'%"':'').'
    GROUP BY A.id
    ORDER BY '.$_REQUEST['sort'].' '.$_REQUEST['dir'];
    
if (isset($_REQUEST['start']) && isset($_REQUEST['limit']))
    $query .= ' LIMIT '.(int)$_REQUEST['start'].','.(int)$_REQUEST['limit'];

$r = $application->getConn()->executeQuery($query);

while ($f = $r->fetch()) {
    $f['bo'] = (boolean)$f['bo'];
    $f['checked'] = (boolean)$f['checked'];
    if ($f['id'] == 1) $f['bo'] = true;
    $f['disabled'] = (boolean)$f['disabled'];
    $data[] = $f;
}

echo json_encode(array(
    'success' => true,
    'total'   => $application->getConn()->fetchColumn('SELECT FOUND_ROWS()'),
	'checked' => '('.sprintf($translator->_('%s отмечено, из них %s имеют Email'),$checked,$checked2).')',
    'rows'    => $data
));
