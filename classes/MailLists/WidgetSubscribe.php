<?php
namespace MailLists;

class WidgetSubscribe extends \Cetera\Widget\Templateable
{
    
    use \Cetera\Widget\Traits\ReCaptcha;
    
	protected $_newsletters = null;
	public $message = '';

	protected function initParams()
	{
		$this->_params = array(
			'newsletters'        => null,
			'newsletters_select' => false,
			'subscribe_text'     => 'Подписаться',
            'email_placeholder'  => 'Email', 
			'ajax'               => false,
            'button_class'       => 'button',
            'form_class'         => '',
			'template'           => 'default.twig',
		);  		
	}	
	
	protected function init()
	{
		$this->initRecaptcha();
    }        

	public function getNewsletters()
	{
		if (!$this->_newsletters)
		{
			$this->_newsletters = \MailLists\Newsletter::enum();
			if ($this->getParam('newsletters'))
			{
				$this->_newsletters->where('id IN ('.$this->getParam('newsletters').')');
			}
		}
		return $this->_newsletters;
	}
	
	public function getHiddenFields()
	{
		$str  = '<input type="hidden" name="subscribe" value="'.$this->getUniqueId().'" />'.
                        '<input type="hidden" name="surname">';
		return $str;
	}

	public static function is_email($email) {
		return filter_var($email, FILTER_VALIDATE_EMAIL) !== FALSE;
	}	
	
	protected function _getHtml()
	{

		if (!$this->getNewsletters()->getCountAll()) return _('нет рассылок для подписки');
		
		if ( isset($_REQUEST['subscribe']) && empty($_REQUEST['surname']) ) {
            
            try {
                
                $this->checkRecaptcha();
            
                $email = $_REQUEST['email'];
                if (self::is_email($email)) {
                    $subscribed = 0;

                    foreach ($this->getNewsletters() as $nl ) {
                        if ( !$this->getParam('newsletters_select') || isset($_REQUEST['newsletter'][$nl->id]) ) {
                            $nl->subscribe( $email );
                            $subscribed++;
                        }
                    }

                    if ($subscribed) {
                        $this->message = '<div class="callout success">'._('Подписка оформлена').'</div>';
                    }
                    else {
                        $this->message = '<div class="callout alert">'._('Не выбрано ни одной рассылки').'</div>';
                    }
                }
                else {
                    $this->message = '<div class="callout alert">'._('Неправильный email').'</div>';
                }
            
            }
			catch (\Exception $e) {
				$this->message = $e->getMessage();
			}
            
		}				
		
		return parent::_getHtml();
	}		
}