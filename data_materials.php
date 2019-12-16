<?php
/************************************************************************************************

Список материалов

*************************************************************************************************/

include_once('common_bo.php');

$data = array();
$total = 0;

$list_id = (int)$_REQUEST['id'];

$f = $application->getConn()->fetchAssoc("select * from mail_lists where id=$list_id");
if (!$f) throw new Exception('no list');

$math_where = '';

if ($f['material_where']) $math_where = '('.$f['material_where'].') and ';  

$r = $application->getConn()->executeQuery('
    SELECT A.idcat, B.typ, D.alias, B.name 
    FROM mail_lists_dirs A, dir_data B, types D 
    WHERE A.idlist='.$list_id.' and B.id=A.idcat and D.id=B.typ');

while ($f = $r->fetch()) {
	$idcat = $f['idcat'];
	$table = $f['alias'];
	// цикл по материалам
	$r2 = $application->getConn()->executeQuery("select name,id from $table where ".$math_where."type&".MATH_PUBLISHED."=1 and type&".MATH_SEND."=0 and idcat=$idcat order by dat desc");
	$count = 0;

	while ($math = $r2->fetch()) {
		$math['table'] = $table;
		$data[] = $math;
		$total++;
	}
}

echo json_encode(array(
    'success' => true,
    'total'   => $total,
    'rows'    => $data
));