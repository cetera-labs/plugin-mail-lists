<?php
namespace MailLists;

define('GROUP_MAIL', -102);

$this->getTranslator()->addTranslation(__DIR__.'/lang');

$this->addUserGroup(array(
    'id'      => GROUP_MAIL,
    'name'    => $translator->_('Пользователи почтовых рассылок'),
    'describ' => $translator->_('Имеют доступ к управлениями почтовыми рассылками'),
));

$this->registerWidget(array(
    'name'          => 'MailList.Subscribe',
    'class'         => '\\MailLists\\WidgetSubscribe',
    'not_placeable' => true
));

if ( $this->getBo() && $this->getUser() && $this->getUser()->hasRight(GROUP_MAIL) )
{
		
    $this->getBo()->addModule(array(
  	    'id'	   => 'mail_lists',
  	    'position' => MENU_SITE,
        'name' 	   => 'Рассылки',
        'icon'     => '/cms/plugins/mail-lists/images/icon_send.gif',
        'class'    => 'Plugin.mail-lists.Panel'
    ));
  
}
$this->registerCronJob( __DIR__.'/scripts/scheduler.php' );

function _($text) {
	return \Cetera\Application::getInstance()->getTranslator()->_($text);
}