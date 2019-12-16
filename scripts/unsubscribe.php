<?php
header('Content-type: text/plain; charset=UTF-8');
$application->connectDb();
$application->initPlugins();

$nl = \MailLists\Newsletter::getById( (int)$_REQUEST['lid'] );
$nl->unsubscribe( \Cetera\User::getById( (int)$_REQUEST['uid'] ) );
die($application->getTranslator()->_('Вы отписаны от рассылки'));