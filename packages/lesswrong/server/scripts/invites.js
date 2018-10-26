import { Accounts } from 'meteor/accounts-base';
import { getSetting } from 'meteor/vulcan:lib';

if (!Meteor.isPackageTest) {
  Accounts.emailTemplates.siteName = 'Post-Fiat Forum';
  Accounts.emailTemplates.from = 'LessWrong 2.0 <no-reply@post-fiat.com>';
  Accounts.emailTemplates.enrollAccount.subject = (user) => {
    return `Activate your Account on Post-Fiat Forum`;
  };
  Accounts.emailTemplates.enrollAccount.text = (user, url) => {
    return 'You are invited to participate in the Post-Fiat Forum closed beta'
      + ' To register an account, simply click the link below:\n\n'
      + url;
  };

  Accounts.emailTemplates.resetPassword.subject = (user) => {
    return `Reset your password on Post-Fiat Forum`;
  };

  Accounts.emailTemplates.resetPassword.from = () => {
    // Overrides the value set in `Accounts.emailTemplates.from` when resetting
    // passwords.
    return 'Post-Fiat Forum <no-reply@post-fiat.com>';
  };

  Accounts.emailTemplates.resetPassword.text = (user, url) => {
    return 'You\'ve requested to reset your password for the Post-Fiat Forum. \n\n'
      + 'To reset your password, click on the link below. The link in this email will expire within 2 days.\n \n'
      + url;
  };
  Accounts.emailTemplates.verifyEmail = {
     subject() {
        return "Verify your email address";
     },
     text(user, url) {
        return `Hey ${user.displayName}! Verify your e-mail by following this link: ${url}`;
     }
  };

  if (getSetting('mailUrl')) {
    // console.log("Set Mail URL environment variable");
    process.env.MAIL_URL = getSetting('mailUrl');
    // console.log("Set Root URL variable");
    process.env.ROOT_URL = "https://www.post-fiat.com/";
  }
}
