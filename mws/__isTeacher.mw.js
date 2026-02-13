module.exports = ({ meta, config, managers }) =>{
    return ({req, res, results, next})=>{
        if(!results.__token){
            return managers.responseDispatcher.dispatch(res, {
                ok: false, 
                code: 401, 
                errors: 'Unauthorized: Token required'
            });
        }
        if(!['teacher', 'school_admin', 'superadmin'].includes(results.__token.role)){
            return managers.responseDispatcher.dispatch(res, {
                ok: false, 
                code: 403, 
                errors: 'Forbidden: Teacher access required'
            });
        }
        next();
    }
}
