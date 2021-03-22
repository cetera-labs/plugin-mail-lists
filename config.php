<?php
namespace MailLists;

define('GROUP_MAIL', -102);

$t = $this->getTranslator();
$t->addTranslation(__DIR__.'/lang');

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

\Cetera\Event::attach('CORE_USER_DELETE', function($event, $data){
	\Cetera\Application::getInstance()->getDbConnection()->delete('mail_lists_users', ['iduser' => $data['user']->id]);
});

if ( $this->getBo() ) {
    
    $params = array(        
        'newsletter.id'     => $t->_('ID рассылки'),
        'newsletter.name'   => $t->_('Рассылка'),
        'user.email'        => $t->_('Email пользователя'),
    );    
    $this->getBo()->registerEvent('NEWSLETTER_SUBSCRIBE', $t->_('Пользователь подписался на рассылку'), $params);
    $this->getBo()->registerEvent('NEWSLETTER_UNSUBSCRIBE', $t->_('Пользователь отписался от рассылки'), $params);

    if ( $this->getUser() && $this->getUser()->hasRight(GROUP_MAIL) ) {
            
        $this->getBo()->addModule(array(
            'id'	   => 'mail_lists',
            'position' => MENU_SITE,
            'name' 	   => 'Рассылки',
            'icon'     => '/cms/plugins/mail-lists/images/icon_send.gif',
            'iconCls'  => 'x-fas fa-envelope',
            'class'    => 'Plugin.mail-lists.Panel'
        ));
      
    }

}
$this->registerCronJob( __DIR__.'/scripts/scheduler.php' );