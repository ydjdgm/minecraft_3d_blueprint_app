import {handleShare} from '../../../../db/shares';
type Context={params:Promise<{id:string}>};
export const GET=async(request:Request,context:Context)=>handleShare(request,(await context.params).id);
export const DELETE=async(request:Request,context:Context)=>handleShare(request,(await context.params).id);
