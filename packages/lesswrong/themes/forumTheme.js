import { getSetting } from 'meteor/vulcan:core'

import lwTheme from '../themes/lesswrongTheme'
import afTheme from '../themes/alignmentForumTheme'
// import eaTheme from '../themes/eaTheme'


const forumTheme = getSetting('AlignmentForum', false) ? afTheme : lwTheme

export default forumTheme
